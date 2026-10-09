package com.championsclub.reporting.service;

import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.UserRepository;
import com.championsclub.reporting.domain.DateRangePreset;
import com.championsclub.reporting.domain.ReportShare;
import com.championsclub.reporting.domain.ReportType;
import com.championsclub.reporting.dto.CreateReportShareRequest;
import com.championsclub.reporting.dto.FinancialSummaryDto;
import com.championsclub.reporting.dto.ReportShareResponse;
import com.championsclub.reporting.repo.ReportShareRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportShareService {

    private final ReportShareRepository reportShareRepository;
    private final UserRepository userRepository;
    private final ReportingService reportingService;
    private final ReportingDateHelper dateHelper;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public ReportShareResponse createShare(CreateReportShareRequest request, UUID currentUserId) {
        User creator = (currentUserId != null) ? userRepository.findById(currentUserId).orElse(null) : null;

        DateRangePreset preset = (request.getPreset() != null) ? request.getPreset() : DateRangePreset.THIS_MONTH;
        ReportingDateHelper.DateRange range = dateHelper.calculateRange(preset, request.getDateFrom(), request.getDateTo());

        int hours = (request.getExpireInHours() != null && request.getExpireInHours() > 0) ? request.getExpireInHours() : 168; // Default 7 days
        Instant expiresAt = Instant.now().plus(hours, ChronoUnit.HOURS);

        // Generate high-entropy 256-bit URL-safe token
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        ReportType rType = (request.getReportType() != null) ? request.getReportType() : ReportType.FINANCIAL_SUMMARY;

        ReportShare share = ReportShare.builder()
                .shareToken(token)
                .title(request.getTitle())
                .reportType(rType)
                .dateFrom(range.getStartDate())
                .dateTo(range.getEndDate())
                .preset(preset.name())
                .expiresAt(expiresAt)
                .revoked(false)
                .createdBy(creator)
                .build();

        ReportShare saved = reportShareRepository.save(share);
        log.info("Created report share token {} for report '{}', expires {}", saved.getShareToken(), saved.getTitle(), saved.getExpiresAt());

        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public FinancialSummaryDto getSharedReportData(String token) {
        ReportShare share = reportShareRepository.findByShareToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("ReportShare", token));

        if (share.isRevoked()) {
            throw new IllegalStateException("This report share link has been revoked by management.");
        }

        if (share.isExpired()) {
            throw new IllegalStateException("This report share link has expired.");
        }

        return reportingService.getFinancialSummary(DateRangePreset.CUSTOM, share.getDateFrom(), share.getDateTo());
    }

    @Transactional(readOnly = true)
    public ReportShareResponse getShareMetadata(String token) {
        ReportShare share = reportShareRepository.findByShareToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("ReportShare", token));
        return mapToResponse(share);
    }

    @Transactional(readOnly = true)
    public List<ReportShareResponse> listAllShares() {
        return reportShareRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ReportShareResponse revokeShare(UUID id) {
        ReportShare share = reportShareRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ReportShare", id));

        share.setRevoked(true);
        share.setRevokedAt(Instant.now());
        ReportShare updated = reportShareRepository.save(share);
        log.info("Revoked report share {} ({})", updated.getId(), updated.getTitle());
        return mapToResponse(updated);
    }

    private ReportShareResponse mapToResponse(ReportShare share) {
        String url = frontendUrl + "/shared-report/" + share.getShareToken();
        return ReportShareResponse.builder()
                .id(share.getId())
                .shareToken(share.getShareToken())
                .shareUrl(url)
                .title(share.getTitle())
                .reportType(share.getReportType())
                .dateFrom(share.getDateFrom())
                .dateTo(share.getDateTo())
                .preset(share.getPreset())
                .expiresAt(share.getExpiresAt())
                .revoked(share.isRevoked())
                .createdAt(share.getCreatedAt())
                .build();
    }
}
