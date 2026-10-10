package com.championsclub.common.error;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private final Clock clock;

    public GlobalExceptionHandler(Clock clock) {
        this.clock = clock;
    }

    @ExceptionHandler(DuplicateMemberException.class)
    public ResponseEntity<ApiErrorResponse> handleDuplicateMemberException(DuplicateMemberException ex, HttpServletRequest request) {
        log.warn("Duplicate member: [{}] {}", ex.getCode(), ex.getMessage());
        ApiErrorResponse body = ApiErrorResponse.builder()
                .timestamp(clock.instant())
                .status(HttpStatus.CONFLICT.value())
                .code(ex.getCode())
                .message(ex.getMessage())
                .existingMemberId(ex.getExistingMemberId())
                .existingMemberNo(ex.getExistingMemberNo())
                .path(request.getRequestURI())
                .traceId(getTraceId())
                .build();
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(BlackoutConflictException.class)
    public ResponseEntity<ApiErrorResponse> handleBlackoutConflictException(BlackoutConflictException ex, HttpServletRequest request) {
        log.warn("Blackout conflict: [{}] {}", ex.getCode(), ex.getMessage());
        ApiErrorResponse body = ApiErrorResponse.builder()
                .timestamp(clock.instant())
                .status(HttpStatus.CONFLICT.value())
                .code(ex.getCode())
                .message(ex.getMessage())
                .conflictingBookings(ex.getConflictingBookings())
                .path(request.getRequestURI())
                .traceId(getTraceId())
                .build();
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(ChampionsClubException.class)
    public ResponseEntity<ApiErrorResponse> handleChampionsClubException(ChampionsClubException ex, HttpServletRequest request) {
        log.warn("Application exception: [{}] {}", ex.getCode(), ex.getMessage());
        ApiErrorResponse body = ApiErrorResponse.builder()
                .timestamp(clock.instant())
                .status(ex.getStatus().value())
                .code(ex.getCode())
                .message(ex.getMessage())
                .path(request.getRequestURI())
                .traceId(getTraceId())
                .build();
        return ResponseEntity.status(ex.getStatus()).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidationException(MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<FieldErrorItem> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(this::mapFieldError)
                .toList();

        ApiErrorResponse body = ApiErrorResponse.builder()
                .timestamp(clock.instant())
                .status(HttpStatus.BAD_REQUEST.value())
                .code("VALIDATION_FAILED")
                .message("Request payload validation failed. Check fieldErrors for details.")
                .fieldErrors(fieldErrors)
                .path(request.getRequestURI())
                .traceId(getTraceId())
                .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException ex, HttpServletRequest request) {
        String msg = ex.getMessage();
        if (msg != null && (msg.contains("no_overlapping_court_bookings") || msg.contains("exclusion") || msg.contains("23P01"))) {
            ApiErrorResponse body = ApiErrorResponse.builder()
                    .timestamp(clock.instant())
                    .status(HttpStatus.CONFLICT.value())
                    .code("SLOT_TAKEN")
                    .message("Court slot has just been taken by another reservation.")
                    .path(request.getRequestURI())
                    .traceId(getTraceId())
                    .build();
            return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
        }

        ApiErrorResponse body = ApiErrorResponse.builder()
                .timestamp(clock.instant())
                .status(HttpStatus.CONFLICT.value())
                .code("DATA_INTEGRITY_VIOLATION")
                .message("Operation violates database integrity constraint.")
                .path(request.getRequestURI())
                .traceId(getTraceId())
                .build();
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiErrorResponse> handleBadCredentials(BadCredentialsException ex, HttpServletRequest request) {
        ApiErrorResponse body = ApiErrorResponse.builder()
                .timestamp(clock.instant())
                .status(HttpStatus.UNAUTHORIZED.value())
                .code("INVALID_CREDENTIALS")
                .message("Invalid email or password.")
                .path(request.getRequestURI())
                .traceId(getTraceId())
                .build();
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        ApiErrorResponse body = ApiErrorResponse.builder()
                .timestamp(clock.instant())
                .status(HttpStatus.FORBIDDEN.value())
                .code("FORBIDDEN")
                .message("Access denied. Insufficient role permissions for this resource.")
                .path(request.getRequestURI())
                .traceId(getTraceId())
                .build();
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    @ExceptionHandler({org.springframework.dao.OptimisticLockingFailureException.class, jakarta.persistence.OptimisticLockException.class})
    public ResponseEntity<ApiErrorResponse> handleOptimisticLockConflict(Exception ex, HttpServletRequest request) {
        log.warn("Optimistic locking conflict: {}", ex.getMessage());
        ApiErrorResponse body = ApiErrorResponse.builder()
                .timestamp(clock.instant())
                .status(HttpStatus.CONFLICT.value())
                .code("OPTIMISTIC_LOCK_CONFLICT")
                .message("This record was updated concurrently by another staff member. Please refresh to load the latest state.")
                .path(request.getRequestURI())
                .traceId(getTraceId())
                .build();
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGenericException(Exception ex, HttpServletRequest request) {
        String traceId = getTraceId();
        log.error("Unhandled internal server error [traceId={}]", traceId, ex);
        ApiErrorResponse body = ApiErrorResponse.builder()
                .timestamp(clock.instant())
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .code("INTERNAL_SERVER_ERROR")
                .message("An unexpected error occurred. Please contact support referencing traceId: " + traceId)
                .path(request.getRequestURI())
                .traceId(traceId)
                .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }

    private FieldErrorItem mapFieldError(FieldError fieldError) {
        return FieldErrorItem.builder()
                .field(fieldError.getField())
                .rejectedValue(fieldError.getRejectedValue())
                .message(fieldError.getDefaultMessage())
                .build();
    }

    private String getTraceId() {
        String mdcTrace = org.slf4j.MDC.get("traceId");
        if (mdcTrace != null && !mdcTrace.isBlank()) {
            return mdcTrace;
        }
        return UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }
}
