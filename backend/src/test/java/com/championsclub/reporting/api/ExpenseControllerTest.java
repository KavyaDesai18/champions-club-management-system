package com.championsclub.reporting.api;

import com.championsclub.common.error.GlobalExceptionHandler;
import com.championsclub.common.security.JwtTokenProvider;
import com.championsclub.common.security.SecurityConfig;
import com.championsclub.member.repo.UserRepository;
import com.championsclub.reporting.domain.ExpenseCategory;
import com.championsclub.reporting.domain.ExpenseStatus;
import com.championsclub.reporting.dto.CreateExpenseRequest;
import com.championsclub.reporting.dto.ExpenseDto;
import com.championsclub.reporting.service.ExpenseService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ExpenseController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class ExpenseControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private ExpenseService expenseService;
    @MockBean private JwtTokenProvider jwtTokenProvider;
    @MockBean private UserRepository userRepository;
    @MockBean private Clock clock;

    @Test
    @WithMockUser(roles = "OWNER")
    @DisplayName("Owner can create expense and list expenses")
    void testCreateAndListExpenses() throws Exception {
        UUID expId = UUID.randomUUID();
        ExpenseDto dto = ExpenseDto.builder()
                .id(expId)
                .expenseNumber("EXP-2026-0001")
                .category("RENT")
                .description("Monthly arena lease")
                .amount(new BigDecimal("150000.00"))
                .taxAmount(new BigDecimal("27000.00"))
                .totalAmount(new BigDecimal("177000.00"))
                .status(ExpenseStatus.PENDING)
                .build();

        when(expenseService.createExpense(any(), any())).thenReturn(dto);
        when(expenseService.getExpenses(any(), any(), any(), any())).thenReturn(List.of(dto));

        CreateExpenseRequest req = CreateExpenseRequest.builder()
                .category("RENT")
                .description("Monthly arena lease")
                .amount(new BigDecimal("150000.00"))
                .taxAmount(new BigDecimal("27000.00"))
                .build();

        mockMvc.perform(post("/api/v1/reporting/expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.expenseNumber").value("EXP-2026-0001"))
                .andExpect(jsonPath("$.totalAmount").value(177000.00));

        mockMvc.perform(get("/api/v1/reporting/expenses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].category").value("RENT"));
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    @DisplayName("Manager can mark expense as paid")
    void testMarkAsPaid() throws Exception {
        UUID expId = UUID.randomUUID();
        ExpenseDto dto = ExpenseDto.builder()
                .id(expId)
                .status(ExpenseStatus.PAID)
                .paymentMethod("BANK_TRANSFER")
                .build();

        when(expenseService.markAsPaid(eq(expId), any())).thenReturn(dto);

        mockMvc.perform(post("/api/v1/reporting/expenses/" + expId + "/pay"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID"));
    }

    @Test
    @WithMockUser(roles = "FRONT_DESK")
    @DisplayName("Front Desk is forbidden from managing operating expenses")
    void testFrontDeskForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/reporting/expenses"))
                .andExpect(status().isForbidden());
    }
}
