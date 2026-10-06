package com.championsclub.member.dto;

import com.championsclub.member.domain.ImportJob;
import com.championsclub.member.domain.ImportJobStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportJobDto {
    private UUID id;
    private String filename;
    private Integer totalRows;
    private Integer validRows;
    private Integer duplicateRows;
    private Integer invalidRows;
    private ImportJobStatus status;
    private String createdBy;
    private Instant createdAt;
    private Instant completedAt;

    public static ImportJobDto fromEntity(ImportJob job) {
        if (job == null) return null;
        return ImportJobDto.builder()
                .id(job.getId())
                .filename(job.getFilename())
                .totalRows(job.getTotalRows())
                .validRows(job.getValidRows())
                .duplicateRows(job.getDuplicateRows())
                .invalidRows(job.getInvalidRows())
                .status(job.getStatus())
                .createdBy(job.getCreatedBy())
                .createdAt(job.getCreatedAt())
                .completedAt(job.getCompletedAt())
                .build();
    }
}
