package com.championsclub.common.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final List<String> allowedOrigins;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000}") String allowedOriginsStr
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.allowedOrigins = Arrays.asList(allowedOriginsStr.split(","));
    }

    @Bean
    public TraceIdFilter traceIdFilter() {
        return new TraceIdFilter();
    }

    @Bean
    public RateLimitingFilter rateLimitingFilter(
            @Value("${app.rate-limit.enabled:true}") boolean enabled,
            @Value("${app.rate-limit.auth-rpm:60}") int authRpm,
            @Value("${app.rate-limit.general-rpm:300}") int generalRpm
    ) {
        return new RateLimitingFilter(enabled, authRpm, generalRpm);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            TraceIdFilter traceIdFilter,
            RateLimitingFilter rateLimitingFilter
    ) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .headers(headers -> {
                    headers.frameOptions(frame -> frame.deny())
                            .contentTypeOptions(org.springframework.security.config.Customizer.withDefaults())
                            .xssProtection(org.springframework.security.config.Customizer.withDefaults())
                            .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000))
                            .referrerPolicy(referrer -> referrer.policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                            .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' http://localhost:* ws://localhost:* https:; frame-ancestors 'none';"));
                    headers.permissionsPolicy().policy("camera=(), microphone=(), geolocation=()");
                })
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint())
                        .accessDeniedHandler(accessDeniedHandler())
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/actuator/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**",
                                "/api/v1/public/**",
                                "/public/**",
                                "/api/v1/plans/**",
                                "/api/v1/auth/login",
                                "/api/v1/auth/refresh",
                                "/api/v1/auth/logout",
                                "/api/v1/auth/forgot-password",
                                "/api/v1/auth/reset-password",
                                "/courts/**",
                                "/api/v1/courts/**",
                                "/bookings/**",
                                "/api/v1/bookings/**",
                                "/pricing/**",
                                "/api/v1/pricing/**",
                                "/availability/**",
                                "/api/v1/availability/**",
                                "/api/v1/sports/**",
                                "/social-sessions/**",
                                "/api/v1/social-sessions/**",
                                "/api/v1/shop/catalog/**",
                                "/api/v1/shop/categories/**",
                                "/api/v1/shop/quote/**",
                                "/api/v1/public/shop/**",
                                "/api/payments/webhook/**",
                                "/api/v1/payments/webhook/**",
                                "/api/payments/intent/**",
                                "/api/v1/payments/intent/**",
                                "/api/v1/bar/menu/**",
                                "/api/bar/menu/**",
                                "/api/v1/bar/kitchen-display/stream",
                                "/api/bar/kitchen-display/stream"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(traceIdFilter, org.springframework.security.web.context.SecurityContextHolderFilter.class)
                .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, authException) -> {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("""
                {"status":401,"code":"UNAUTHORIZED","message":"Full authentication is required to access this resource."}
            """.trim());
        };
    }

    @Bean
    public AccessDeniedHandler accessDeniedHandler() {
        return (request, response, accessDeniedException) -> {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("""
                {"status":403,"code":"FORBIDDEN","message":"Access denied. Insufficient role permissions for this resource."}
            """.trim());
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key", "X-Requested-With", "X-Trace-Id", "X-Request-Id"));
        config.setExposedHeaders(List.of("Idempotency-Key", "Location", "X-Trace-Id", "Retry-After"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        // Strict BCrypt with cost 12
        return new BCryptPasswordEncoder(12);
    }
}
