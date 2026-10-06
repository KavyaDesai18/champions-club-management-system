package com.championsclub.member.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportPreviewResponse {
    private UUID jobId;
    private String filename;
    private int totalRows;
    private int validRows;
    private int duplicateRows;
    private int invalidRows;
    private List<PreviewRowDto> rows;
    private List<String> detectedHeaders;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PreviewRowDto {
        private int rowNumber;
        private Map<String, String> rawData;
        private String normalizedFullName;
        private String normalizedEmail;
        private String normalizedPhone;
        private String normalizedDob;
        private String normalizedPlanCode;
        private String rowStatus; // VALID, DUPLICATE, INVALID
        private List<String> errorReasons;
    }
}
