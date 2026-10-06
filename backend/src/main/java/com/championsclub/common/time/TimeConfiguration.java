package com.championsclub.common.time;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

@Configuration
public class TimeConfiguration {

    @Value("${app.timezone:Asia/Kolkata}")
    private String clubTimezone;

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    public ZoneId clubZoneId() {
        return ZoneId.of(clubTimezone);
    }
}
