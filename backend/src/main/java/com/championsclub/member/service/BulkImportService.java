package com.championsclub.member.service;

import com.championsclub.common.audit.AuditService;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.common.util.PhoneUtils;
import com.championsclub.member.domain.Guardian;
import com.championsclub.member.domain.ImportJob;
import com.championsclub.member.domain.ImportJobStatus;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.MemberStatus;
import com.championsclub.member.domain.Plan;
import com.championsclub.member.dto.ImportJobDto;
import com.championsclub.member.dto.ImportPreviewResponse;
import com.championsclub.member.repo.GuardianRepository;
import com.championsclub.member.repo.ImportJobRepository;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.repo.PlanRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class BulkImportService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private final MemberRepository memberRepository;
    private final GuardianRepository guardianRepository;
    private final PlanRepository planRepository;
    private final ImportJobRepository importJobRepository;
    private final ClubTimeUtils timeUtils;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public BulkImportService(
            MemberRepository memberRepository,
            GuardianRepository guardianRepository,
            PlanRepository planRepository,
            ImportJobRepository importJobRepository,
            ClubTimeUtils timeUtils,
            AuditService auditService,
            ObjectMapper objectMapper
    ) {
        this.memberRepository = memberRepository;
        this.guardianRepository = guardianRepository;
        this.planRepository = planRepository;
        this.importJobRepository = importJobRepository;
        this.timeUtils = timeUtils;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    public ImportPreviewResponse previewImport(MultipartFile file, String actor) {
        if (file.isEmpty()) {
            throw new BusinessValidationException("Uploaded file is empty", "EMPTY_IMPORT_FILE");
        }

        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "members_import.csv";
        ParsedSheet parsed = parseFile(file, filename);

        LocalDate today = timeUtils.currentClubDate();
        Map<String, Plan> plansByCode = loadPlansMap();

        Set<String> seenEmailsInFile = new HashSet<>();
        Set<String> seenPhonesInFile = new HashSet<>();

        List<ImportPreviewResponse.PreviewRowDto> previewRows = new ArrayList<>();
        int validCount = 0;
        int duplicateCount = 0;
        int invalidCount = 0;

        List<Map<String, Object>> errorReport = new ArrayList<>();

        for (int i = 0; i < parsed.rows.size(); i++) {
            Map<String, String> raw = parsed.rows.get(i);
            int rowNum = i + 2; // Accounting for 1-based index and header row

            List<String> errors = new ArrayList<>();

            // 1. Full Name
            String name = getValue(raw, "fullname", "name", "membername");
            if (name == null || name.isBlank()) {
                errors.add("Full name is missing");
            }

            // 2. Email
            String email = getValue(raw, "email", "emailaddress");
            String normalizedEmail = email != null ? email.toLowerCase().trim() : "";
            if (normalizedEmail.isEmpty()) {
                errors.add("Email address is missing");
            } else if (!EMAIL_PATTERN.matcher(normalizedEmail).matches()) {
                errors.add("Invalid email format: " + email);
            }

            // 3. Phone
            String phone = getValue(raw, "phone", "mobile", "contact", "phonenumber");
            String normalizedPhone = PhoneUtils.normalizePhone(phone);
            if (normalizedPhone.isEmpty()) {
                errors.add("Phone number is missing");
            }

            // 4. DOB
            String dobStr = getValue(raw, "dob", "dateofbirth", "birthdate");
            LocalDate dob = parseDate(dobStr);
            if (dob == null) {
                errors.add("Date of birth is missing or in unrecognized format: " + dobStr);
            } else if (dob.isAfter(today)) {
                errors.add("Date of birth cannot be in the future");
            } else if (Period.between(dob, today).getYears() > 120) {
                errors.add("Date of birth exceeds realistic lifespan (>120 years)");
            }

            // 5. Plan & Age Rules
            String planCodeRaw = getValue(raw, "plan", "plancode", "tier", "membershiptier");
            String planCode = planCodeRaw != null && !planCodeRaw.isBlank() ? planCodeRaw.toUpperCase().trim() : "SILVER";
            Plan plan = plansByCode.get(planCode);
            if (plan == null) {
                errors.add("Unknown plan code: " + planCodeRaw + " (Available: GOLD, SILVER, JUNIOR)");
            }

            String guardianName = getValue(raw, "guardianname", "parentname", "guardian");
            String guardianPhone = getValue(raw, "guardianphone", "parentphone");
            String guardianRelation = getValue(raw, "guardianrelation", "relation");

            if (dob != null) {
                int age = Period.between(dob, today).getYears();
                if (age < 18) {
                    if (plan != null && !"JUNIOR".equalsIgnoreCase(plan.getCode())) {
                        errors.add("Minor (age " + age + ") must be enrolled in JUNIOR plan");
                    }
                    if (guardianName == null || guardianName.isBlank()) {
                        errors.add("Guardian name is mandatory for minors under 18");
                    }
                    if (guardianPhone == null || guardianPhone.isBlank()) {
                        errors.add("Guardian phone is mandatory for minors under 18");
                    }
                } else {
                    if (plan != null && "JUNIOR".equalsIgnoreCase(plan.getCode())) {
                        errors.add("Adult (age " + age + ") cannot be enrolled in JUNIOR plan");
                    }
                }
            }

            // 6. Duplicate check within file
            boolean isDuplicateInFile = false;
            if (!normalizedEmail.isEmpty() && seenEmailsInFile.contains(normalizedEmail)) {
                errors.add("Duplicate email inside file: " + normalizedEmail);
                isDuplicateInFile = true;
            }
            if (!normalizedPhone.isEmpty() && seenPhonesInFile.contains(normalizedPhone)) {
                errors.add("Duplicate phone inside file: " + normalizedPhone);
                isDuplicateInFile = true;
            }

            seenEmailsInFile.add(normalizedEmail);
            seenPhonesInFile.add(normalizedPhone);

            // 7. Duplicate check against Database
            boolean isDuplicateInDb = false;
            if (errors.isEmpty() || isDuplicateInFile) {
                if (memberRepository.existsByEmailAndIsDeletedFalse(normalizedEmail)) {
                    errors.add("Email already exists in club database: " + normalizedEmail);
                    isDuplicateInDb = true;
                }
                if (memberRepository.existsByPhoneAndIsDeletedFalse(normalizedPhone)) {
                    errors.add("Phone already exists in club database: " + normalizedPhone);
                    isDuplicateInDb = true;
                }
            }

            // Row Status classification
            String rowStatus;
            if (isDuplicateInFile || isDuplicateInDb) {
                rowStatus = "DUPLICATE";
                duplicateCount++;
            } else if (!errors.isEmpty()) {
                rowStatus = "INVALID";
                invalidCount++;
            } else {
                rowStatus = "VALID";
                validCount++;
            }

            if (!errors.isEmpty()) {
                Map<String, Object> errItem = new HashMap<>();
                errItem.put("rowNumber", rowNum);
                errItem.put("name", name);
                errItem.put("email", email);
                errItem.put("phone", phone);
                errItem.put("errors", errors);
                errorReport.add(errItem);
            }

            previewRows.add(ImportPreviewResponse.PreviewRowDto.builder()
                    .rowNumber(rowNum)
                    .rawData(raw)
                    .normalizedFullName(name != null ? name.trim() : "")
                    .normalizedEmail(normalizedEmail)
                    .normalizedPhone(normalizedPhone)
                    .normalizedDob(dob != null ? dob.toString() : "")
                    .normalizedPlanCode(plan != null ? plan.getCode() : planCode)
                    .rowStatus(rowStatus)
                    .errorReasons(errors)
                    .build());
        }

        String errorJson = null;
        try {
            errorJson = objectMapper.writeValueAsString(errorReport);
        } catch (Exception ignored) {}

        ImportJob job = ImportJob.builder()
                .filename(filename)
                .totalRows(parsed.rows.size())
                .validRows(validCount)
                .duplicateRows(duplicateCount)
                .invalidRows(invalidCount)
                .status(ImportJobStatus.DRY_RUN)
                .errorReportJson(errorJson)
                .createdBy(actor)
                .build();
        job = importJobRepository.save(job);

        return ImportPreviewResponse.builder()
                .jobId(job.getId())
                .filename(filename)
                .totalRows(parsed.rows.size())
                .validRows(validCount)
                .duplicateRows(duplicateCount)
                .invalidRows(invalidCount)
                .rows(previewRows)
                .detectedHeaders(parsed.headers)
                .build();
    }

    @Transactional
    public ImportJobDto commitImport(MultipartFile file, UUID dryRunJobId, String actor) {
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "members_import.csv";
        ParsedSheet parsed = parseFile(file, filename);

        LocalDate today = timeUtils.currentClubDate();
        Map<String, Plan> plansByCode = loadPlansMap();

        Set<String> seenEmailsInFile = new HashSet<>();
        Set<String> seenPhonesInFile = new HashSet<>();

        List<Member> membersToSave = new ArrayList<>();
        List<Guardian> guardiansToSave = new ArrayList<>();
        List<Map<String, Object>> errorReport = new ArrayList<>();

        int committedCount = 0;
        int duplicateCount = 0;
        int invalidCount = 0;

        for (int i = 0; i < parsed.rows.size(); i++) {
            Map<String, String> raw = parsed.rows.get(i);
            int rowNum = i + 2;

            List<String> errors = new ArrayList<>();

            String name = getValue(raw, "fullname", "name", "membername");
            String email = getValue(raw, "email", "emailaddress");
            String normalizedEmail = email != null ? email.toLowerCase().trim() : "";
            String phone = getValue(raw, "phone", "mobile", "contact", "phonenumber");
            String normalizedPhone = PhoneUtils.normalizePhone(phone);
            String dobStr = getValue(raw, "dob", "dateofbirth", "birthdate");
            LocalDate dob = parseDate(dobStr);
            String planCodeRaw = getValue(raw, "plan", "plancode", "tier", "membershiptier");
            String planCode = planCodeRaw != null && !planCodeRaw.isBlank() ? planCodeRaw.toUpperCase().trim() : "SILVER";
            Plan plan = plansByCode.get(planCode);

            String guardianName = getValue(raw, "guardianname", "parentname", "guardian");
            String guardianPhone = getValue(raw, "guardianphone", "parentphone");
            String guardianRelation = getValue(raw, "guardianrelation", "relation");
            String gender = getValue(raw, "gender", "sex");
            String address = getValue(raw, "address", "city");
            String emergencyContact = getValue(raw, "emergencycontact", "emergency");
            String notes = getValue(raw, "notes", "remarks");

            // Membership end date (may be past date -> import as EXPIRED)
            String endDateStr = getValue(raw, "enddate", "expirydate", "validtill");
            LocalDate customEndDate = parseDate(endDateStr);

            // Validations
            if (name == null || name.isBlank()) errors.add("Missing name");
            if (normalizedEmail.isEmpty() || !EMAIL_PATTERN.matcher(normalizedEmail).matches()) errors.add("Invalid email");
            if (normalizedPhone.isEmpty()) errors.add("Invalid phone");
            if (dob == null || dob.isAfter(today)) errors.add("Invalid DOB");
            if (plan == null) errors.add("Unknown plan: " + planCodeRaw);

            if (dob != null) {
                int age = Period.between(dob, today).getYears();
                if (age < 18) {
                    if (plan != null && !"JUNIOR".equalsIgnoreCase(plan.getCode())) errors.add("Minors must be on JUNIOR plan");
                    if (guardianName == null || guardianName.isBlank()) errors.add("Guardian name required for minor");
                    if (guardianPhone == null || guardianPhone.isBlank()) errors.add("Guardian phone required for minor");
                } else {
                    if (plan != null && "JUNIOR".equalsIgnoreCase(plan.getCode())) errors.add("Adult cannot be on JUNIOR plan");
                }
            }

            // In-file duplicate check
            if (!normalizedEmail.isEmpty() && seenEmailsInFile.contains(normalizedEmail)) {
                errors.add("Duplicate email in file");
            }
            if (!normalizedPhone.isEmpty() && seenPhonesInFile.contains(normalizedPhone)) {
                errors.add("Duplicate phone in file");
            }
            seenEmailsInFile.add(normalizedEmail);
            seenPhonesInFile.add(normalizedPhone);

            // DB duplicate check (Idempotent: skip existing members)
            if (errors.isEmpty()) {
                if (memberRepository.existsByEmailAndIsDeletedFalse(normalizedEmail) ||
                    memberRepository.existsByPhoneAndIsDeletedFalse(normalizedPhone)) {
                    duplicateCount++;
                    continue; // Skip duplicate without failing the rest of the batch
                }
            }

            if (!errors.isEmpty()) {
                invalidCount++;
                Map<String, Object> errItem = new HashMap<>();
                errItem.put("rowNumber", rowNum);
                errItem.put("email", email);
                errItem.put("phone", phone);
                errItem.put("errors", errors);
                errorReport.add(errItem);
                continue;
            }

            // Build member
            LocalDate startDate = today;
            LocalDate endDate = customEndDate != null ? customEndDate : startDate.plusMonths(plan.getDurationMonths());
            MemberStatus status = today.isAfter(endDate) ? MemberStatus.EXPIRED : MemberStatus.ACTIVE;

            String memberNo = generateUniqueMemberNumber();

            Member member = Member.builder()
                    .memberNo(memberNo)
                    .fullName(name.trim())
                    .email(normalizedEmail)
                    .phone(normalizedPhone)
                    .dob(dob)
                    .gender(gender)
                    .address(address)
                    .emergencyContact(emergencyContact)
                    .status(status)
                    .plan(plan)
                    .notes(notes)
                    .startDate(startDate)
                    .endDate(endDate)
                    .walletBalance(BigDecimal.ZERO)
                    .guestPassesRemaining("GOLD".equalsIgnoreCase(plan.getCode()) ? 2 : 0)
                    .build();

            membersToSave.add(member);

            if (dob != null && Period.between(dob, today).getYears() < 18) {
                Guardian guardian = Guardian.builder()
                        .member(member)
                        .name(guardianName.trim())
                        .phone(PhoneUtils.normalizePhone(guardianPhone))
                        .relation(guardianRelation != null && !guardianRelation.isBlank() ? guardianRelation.trim() : "Parent")
                        .consentAt(Instant.now())
                        .build();
                guardiansToSave.add(guardian);
            }

            committedCount++;
        }

        // Save batch
        memberRepository.saveAll(membersToSave);
        guardianRepository.saveAll(guardiansToSave);

        String errorJson = null;
        try {
            errorJson = objectMapper.writeValueAsString(errorReport);
        } catch (Exception ignored) {}

        ImportJob job = ImportJob.builder()
                .filename(filename)
                .totalRows(parsed.rows.size())
                .validRows(committedCount)
                .duplicateRows(duplicateCount)
                .invalidRows(invalidCount)
                .status(ImportJobStatus.COMPLETED)
                .errorReportJson(errorJson)
                .createdBy(actor)
                .completedAt(Instant.now())
                .build();
        job = importJobRepository.save(job);

        auditService.log("BULK_IMPORT_COMPLETED", "Imported " + committedCount + " members from " + filename + " (skipped " + duplicateCount + " duplicates)", actor, job.getId());

        return ImportJobDto.fromEntity(job);
    }

    @Transactional(readOnly = true)
    public String getErrorReportJson(UUID jobId) {
        ImportJob job = importJobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Import job not found: " + jobId, "JOB_NOT_FOUND"));
        return job.getErrorReportJson() != null ? job.getErrorReportJson() : "[]";
    }

    private ParsedSheet parseFile(MultipartFile file, String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
            return parseExcel(file);
        } else {
            return parseCsv(file);
        }
    }

    private ParsedSheet parseExcel(MultipartFile file) {
        List<Map<String, String>> rows = new ArrayList<>();
        List<String> rawHeaders = new ArrayList<>();

        try (InputStream is = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            int firstRowNum = sheet.getFirstRowNum();
            int lastRowNum = sheet.getLastRowNum();

            // Find header row (first row with at least 2 non-empty cells)
            Row headerRow = null;
            int headerIndex = firstRowNum;
            for (int r = firstRowNum; r <= lastRowNum; r++) {
                Row row = sheet.getRow(r);
                if (row != null && countNonEmptyCells(row) >= 2) {
                    headerRow = row;
                    headerIndex = r;
                    break;
                }
            }

            if (headerRow == null) {
                return new ParsedSheet(rawHeaders, rows);
            }

            int lastCellNum = headerRow.getLastCellNum();
            for (int c = 0; c < lastCellNum; c++) {
                Cell cell = headerRow.getCell(c);
                String val = getCellValueAsString(cell);
                rawHeaders.add(val != null ? val.trim() : "col_" + c);
            }

            for (int r = headerIndex + 1; r <= lastRowNum; r++) {
                Row row = sheet.getRow(r);
                if (row == null || countNonEmptyCells(row) == 0) continue;

                Map<String, String> rowMap = new LinkedHashMap<>();
                for (int c = 0; c < rawHeaders.size(); c++) {
                    Cell cell = row.getCell(c);
                    String val = getCellValueAsString(cell);
                    rowMap.put(rawHeaders.get(c), val != null ? val.trim() : "");
                }
                rows.add(rowMap);
            }

        } catch (Exception ex) {
            throw new BusinessValidationException("Failed to read Excel spreadsheet: " + ex.getMessage(), "EXCEL_PARSE_ERROR");
        }

        return new ParsedSheet(rawHeaders, rows);
    }

    private ParsedSheet parseCsv(MultipartFile file) {
        List<Map<String, String>> rows = new ArrayList<>();
        List<String> rawHeaders = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            boolean firstLine = true;

            while ((line = reader.readLine()) != null) {
                // Strip UTF-8 Byte Order Mark (BOM) if present
                if (firstLine && line.startsWith("\uFEFF")) {
                    line = line.substring(1);
                }
                line = line.trim();
                if (line.isEmpty()) continue;

                String delimiter = line.contains(";") ? ";" : (line.contains("\t") ? "\t" : ",");
                String[] tokens = line.split(delimiter, -1);

                if (firstLine) {
                    for (int c = 0; c < tokens.length; c++) {
                        String cleanH = cleanCsvToken(tokens[c]);
                        rawHeaders.add(!cleanH.isEmpty() ? cleanH : "col_" + c);
                    }
                    firstLine = false;
                } else {
                    Map<String, String> rowMap = new LinkedHashMap<>();
                    for (int c = 0; c < rawHeaders.size(); c++) {
                        String val = c < tokens.length ? cleanCsvToken(tokens[c]) : "";
                        rowMap.put(rawHeaders.get(c), val);
                    }
                    rows.add(rowMap);
                }
            }
        } catch (Exception ex) {
            throw new BusinessValidationException("Failed to parse CSV file: " + ex.getMessage(), "CSV_PARSE_ERROR");
        }

        return new ParsedSheet(rawHeaders, rows);
    }

    private String cleanCsvToken(String token) {
        if (token == null) return "";
        String s = token.trim();
        if (s.startsWith("\"") && s.endsWith("\"") && s.length() >= 2) {
            s = s.substring(1, s.length() - 1).replace("\"\"", "\"").trim();
        }
        return s;
    }

    private int countNonEmptyCells(Row row) {
        int count = 0;
        for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            String val = getCellValueAsString(cell);
            if (val != null && !val.trim().isEmpty()) count++;
        }
        return count;
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        CellType type = cell.getCellType();
        if (type == CellType.STRING) {
            return cell.getStringCellValue();
        } else if (type == CellType.NUMERIC) {
            if (DateUtil.isCellDateFormatted(cell)) {
                try {
                    return cell.getLocalDateTimeCellValue().toLocalDate().toString();
                } catch (Exception e) {
                    return cell.getDateCellValue().toInstant().toString();
                }
            } else {
                double val = cell.getNumericCellValue();
                // If whole number, format without decimals (preserves phone numbers without scientific notation)
                if (val == Math.floor(val)) {
                    return String.format("%.0f", val);
                }
                return String.valueOf(val);
            }
        } else if (type == CellType.BOOLEAN) {
            return String.valueOf(cell.getBooleanCellValue());
        } else if (type == CellType.FORMULA) {
            try {
                return cell.getStringCellValue();
            } catch (Exception e) {
                return String.valueOf(cell.getNumericCellValue());
            }
        }
        return "";
    }

    private String getValue(Map<String, String> row, String... candidateKeys) {
        for (Map.Entry<String, String> entry : row.entrySet()) {
            String norm = normalizeKey(entry.getKey());
            for (String cand : candidateKeys) {
                if (norm.equals(cand) || norm.contains(cand)) {
                    return entry.getValue();
                }
            }
        }
        return null;
    }

    private String normalizeKey(String key) {
        if (key == null) return "";
        return key.toLowerCase().replaceAll("[^a-z0-9]", "");
    }

    private LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String s = raw.trim();

        // Standard patterns
        List<DateTimeFormatter> formatters = List.of(
                DateTimeFormatter.ofPattern("yyyy-MM-dd"),
                DateTimeFormatter.ofPattern("d/M/yyyy"),
                DateTimeFormatter.ofPattern("dd/MM/yyyy"),
                DateTimeFormatter.ofPattern("d-M-yyyy"),
                DateTimeFormatter.ofPattern("dd-MM-yyyy"),
                DateTimeFormatter.ofPattern("M/d/yyyy"),
                DateTimeFormatter.ofPattern("MM/dd/yyyy"),
                DateTimeFormatter.ofPattern("yyyy/MM/dd")
        );

        for (DateTimeFormatter fmt : formatters) {
            try {
                return LocalDate.parse(s, fmt);
            } catch (DateTimeParseException ignored) {}
        }
        return null;
    }

    private Map<String, Plan> loadPlansMap() {
        Map<String, Plan> map = new HashMap<>();
        for (Plan p : planRepository.findAll()) {
            map.put(p.getCode().toUpperCase().trim(), p);
        }
        return map;
    }

    private synchronized String generateUniqueMemberNumber() {
        try {
            Long nextSeq = memberRepository.getNextMemberSequence();
            return String.format("CC-%06d", nextSeq);
        } catch (Exception ex) {
            return String.format("CC-%06d", (long)(Math.random() * 900000 + 100000));
        }
    }

    private record ParsedSheet(List<String> headers, List<Map<String, String>> rows) {}
}
