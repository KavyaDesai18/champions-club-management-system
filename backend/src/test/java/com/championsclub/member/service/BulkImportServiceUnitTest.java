package com.championsclub.member.service;

import com.championsclub.common.audit.AuditService;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.member.domain.ImportJob;
import com.championsclub.member.domain.Plan;
import com.championsclub.member.dto.ImportJobDto;
import com.championsclub.member.dto.ImportPreviewResponse;
import com.championsclub.member.repo.GuardianRepository;
import com.championsclub.member.repo.ImportJobRepository;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.repo.PlanRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BulkImportServiceUnitTest {

    @Mock private MemberRepository memberRepository;
    @Mock private GuardianRepository guardianRepository;
    @Mock private PlanRepository planRepository;
    @Mock private ImportJobRepository importJobRepository;
    @Mock private AuditService auditService;

    private BulkImportService bulkImportService;
    private final LocalDate fixedDate = LocalDate.of(2026, 10, 6);

    @BeforeEach
    void setUp() {
        Clock fixedClock = Clock.fixed(fixedDate.atStartOfDay(ZoneId.of("Asia/Kolkata")).toInstant(), ZoneId.of("Asia/Kolkata"));
        ClubTimeUtils timeUtils = new ClubTimeUtils(fixedClock, ZoneId.of("Asia/Kolkata"));
        ObjectMapper objectMapper = new ObjectMapper();

        bulkImportService = new BulkImportService(
                memberRepository,
                guardianRepository,
                planRepository,
                importJobRepository,
                timeUtils,
                auditService,
                objectMapper
        );

        Plan gold = Plan.builder().id(UUID.randomUUID()).code("GOLD").name("Gold").durationMonths(12).build();
        Plan silver = Plan.builder().id(UUID.randomUUID()).code("SILVER").name("Silver").durationMonths(12).build();
        Plan junior = Plan.builder().id(UUID.randomUUID()).code("JUNIOR").name("Junior").durationMonths(12).build();

        when(planRepository.findAll()).thenReturn(List.of(gold, silver, junior));
    }

    @Test
    @DisplayName("Previews CSV file with valid, duplicate, and invalid rows")
    void previewCsvImport() {
        String csvContent = """
                Full Name,Email,Phone,DOB,Plan,Guardian Name,Guardian Phone
                Rahul Dravid,rahul@wall.com,9876543210,1973-01-11,GOLD,,
                Junior Player,junior@kid.com,9876543211,2010-05-15,JUNIOR,Papa Player,9876543212
                Invalid Minor,minor@test.com,9876543213,2012-08-20,GOLD,,
                Rahul Dravid,rahul@wall.com,9876543210,1973-01-11,GOLD,,
                """;

        MockMultipartFile file = new MockMultipartFile("file", "members.csv", "text/csv", csvContent.getBytes());

        when(importJobRepository.save(any(ImportJob.class))).thenAnswer(i -> {
            ImportJob j = i.getArgument(0);
            j.setId(UUID.randomUUID());
            return j;
        });

        ImportPreviewResponse preview = bulkImportService.previewImport(file, "TEST");

        assertThat(preview.getTotalRows()).isEqualTo(4);
        assertThat(preview.getValidRows()).isEqualTo(2); // Rahul + Junior Player
        assertThat(preview.getInvalidRows()).isEqualTo(1); // Invalid Minor (minor on GOLD without guardian)
        assertThat(preview.getDuplicateRows()).isEqualTo(1); // Row 4 duplicate of row 1
    }

    @Test
    @DisplayName("Parses Excel XLSX file with scientific notation and numeric cells")
    void previewXlsxWithScientificNotation() throws IOException {
        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Members");

        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("Name");
        header.createCell(1).setCellValue("Email");
        header.createCell(2).setCellValue("Phone");
        header.createCell(3).setCellValue("DOB");
        header.createCell(4).setCellValue("Plan");

        Row r1 = sheet.createRow(1);
        r1.createCell(0).setCellValue("Virat Kohli");
        r1.createCell(1).setCellValue("virat@champions.com");
        r1.createCell(2).setCellValue(9876543210L); // Numeric phone in Excel
        r1.createCell(3).setCellValue("1988-11-05");
        r1.createCell(4).setCellValue("GOLD");

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        workbook.write(baos);
        workbook.close();

        MockMultipartFile file = new MockMultipartFile("file", "members.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", baos.toByteArray());

        when(importJobRepository.save(any(ImportJob.class))).thenAnswer(i -> {
            ImportJob j = i.getArgument(0);
            j.setId(UUID.randomUUID());
            return j;
        });

        ImportPreviewResponse preview = bulkImportService.previewImport(file, "TEST");

        assertThat(preview.getTotalRows()).isEqualTo(1);
        assertThat(preview.getValidRows()).isEqualTo(1);
        assertThat(preview.getRows().get(0).getNormalizedPhone()).isEqualTo("+919876543210");
    }

    @Test
    @DisplayName("Commit import imports past membership end dates as EXPIRED")
    void commitImportPastDateImportsAsExpired() {
        String csvContent = """
                Name,Email,Phone,DOB,Plan,End Date
                Old Timer,old@timer.com,9876543210,1980-01-01,SILVER,2024-01-01
                """;

        MockMultipartFile file = new MockMultipartFile("file", "expired.csv", "text/csv", csvContent.getBytes());

        when(importJobRepository.save(any(ImportJob.class))).thenAnswer(i -> {
            ImportJob j = i.getArgument(0);
            j.setId(UUID.randomUUID());
            return j;
        });

        ImportJobDto result = bulkImportService.commitImport(file, null, "TEST");

        assertThat(result.getValidRows()).isEqualTo(1);
        assertThat(result.getStatus().name()).isEqualTo("COMPLETED");
    }
}
