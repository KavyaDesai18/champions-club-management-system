package com.championsclub.crm.service;

import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.security.Role;
import com.championsclub.crm.domain.Lead;
import com.championsclub.crm.domain.LeadActivity;
import com.championsclub.crm.domain.LeadActivityType;
import com.championsclub.crm.domain.LeadSource;
import com.championsclub.crm.domain.LeadStatus;
import com.championsclub.crm.domain.Quote;
import com.championsclub.crm.domain.QuoteStatus;
import com.championsclub.crm.dto.ConvertLeadRequest;
import com.championsclub.crm.dto.CreateQuoteRequest;
import com.championsclub.crm.dto.LeadDto;
import com.championsclub.crm.dto.PublicEnquiryRequest;
import com.championsclub.crm.dto.QuoteDto;
import com.championsclub.crm.dto.QuoteLineDto;
import com.championsclub.crm.repo.LeadActivityRepository;
import com.championsclub.crm.repo.LeadRepository;
import com.championsclub.crm.repo.QuoteRepository;
import com.championsclub.crm.util.RateLimiter;
import com.championsclub.crm.util.XssSanitizer;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.Plan;
import com.championsclub.member.domain.User;
import com.championsclub.member.dto.Member360Dto;
import com.championsclub.member.dto.PlanDto;
import com.championsclub.member.dto.RegisterMemberRequest;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.repo.UserRepository;
import com.championsclub.member.service.MemberService;
import com.championsclub.notification.domain.NotificationType;
import com.championsclub.notification.service.NotificationDispatcher;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LeadServiceUnitTest {

    @Mock
    private LeadRepository leadRepository;

    @Mock
    private LeadActivityRepository activityRepository;

    @Mock
    private QuoteRepository quoteRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private MemberService memberService;

    @Mock
    private NotificationDispatcher notificationDispatcher;

    @Mock
    private JdbcTemplate jdbcTemplate;

    private RateLimiter rateLimiter;
    private XssSanitizer xssSanitizer;
    private ObjectMapper objectMapper;

    private LeadService leadService;
    private QuoteService quoteService;

    @BeforeEach
    void setUp() {
        rateLimiter = new RateLimiter();
        xssSanitizer = new XssSanitizer();
        objectMapper = new ObjectMapper();

        leadService = new LeadService(
                leadRepository,
                activityRepository,
                quoteRepository,
                userRepository,
                memberRepository,
                memberService,
                notificationDispatcher,
                rateLimiter,
                xssSanitizer
        );

        quoteService = new QuoteService(
                quoteRepository,
                leadRepository,
                activityRepository,
                notificationDispatcher,
                objectMapper,
                jdbcTemplate
        );
    }

    @Test
    @DisplayName("Duplicate lead detection: repeated enquiries merge into existing lead")
    void testDuplicateLeadMerge() {
        UUID existingId = UUID.randomUUID();
        Lead existingLead = Lead.builder()
                .id(existingId)
                .name("Kavya Desai")
                .email("kavya@example.com")
                .phone("+919876543210")
                .status(LeadStatus.NEW)
                .interest("Badminton")
                .build();

        when(leadRepository.findByEmailIgnoreCase("kavya@example.com"))
                .thenReturn(Optional.of(existingLead));
        when(leadRepository.save(any(Lead.class))).thenAnswer(i -> i.getArgument(0));

        PublicEnquiryRequest req = PublicEnquiryRequest.builder()
                .name("Kavya Desai")
                .email("kavya@example.com")
                .phone("+919876543210")
                .interest("Badminton")
                .message("Follow-up question on court availability.")
                .build();

        LeadDto result = leadService.processEnquiry(req, "127.0.0.1");

        assertThat(result.getId()).isEqualTo(existingId);
        verify(leadRepository).save(existingLead);

        ArgumentCaptor<LeadActivity> activityCaptor = ArgumentCaptor.forClass(LeadActivity.class);
        verify(activityRepository).save(activityCaptor.capture());
        assertThat(activityCaptor.getValue().getType()).isEqualTo(LeadActivityType.ENQUIRY_UPDATE);
        assertThat(activityCaptor.getValue().getDetails()).contains("Repeated website enquiry received");
    }

    @Test
    @DisplayName("Edge Case: 5 repeated submissions from the same person merge into single lead")
    void testFiveDuplicateSubmissions() {
        UUID existingId = UUID.randomUUID();
        Lead existingLead = Lead.builder()
                .id(existingId)
                .name("Rahul Dravid")
                .email("rahul@example.com")
                .phone("+919999900000")
                .status(LeadStatus.NEW)
                .build();

        when(leadRepository.findByEmailIgnoreCase("rahul@example.com"))
                .thenReturn(Optional.of(existingLead));
        when(leadRepository.save(any(Lead.class))).thenAnswer(i -> i.getArgument(0));

        for (int i = 1; i <= 5; i++) {
            PublicEnquiryRequest req = PublicEnquiryRequest.builder()
                    .name("Rahul Dravid")
                    .email("rahul@example.com")
                    .phone("+919999900000")
                    .message("Message submission number " + i)
                    .build();
            LeadDto dto = leadService.processEnquiry(req, "10.0.0.1");
            assertThat(dto.getId()).isEqualTo(existingId);
        }

        // Verified 5 activities logged on the single merged lead
        verify(activityRepository, times(5)).save(any(LeadActivity.class));
    }

    @Test
    @DisplayName("Edge Case: Lead with no contact method is rejected with 400 validation error")
    void testLeadWithNoContactMethod() {
        PublicEnquiryRequest req = PublicEnquiryRequest.builder()
                .name("Anonymous Person")
                .email(null)
                .phone("")
                .message("Hello club")
                .build();

        assertThatThrownBy(() -> leadService.processEnquiry(req, "127.0.0.1"))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Please provide at least one contact method");
    }

    @Test
    @DisplayName("Security: XSS in message and name is sanitized")
    void testXssSanitizationInNameAndMessage() {
        PublicEnquiryRequest req = PublicEnquiryRequest.builder()
                .name("Hacker <script>alert('xss')</script>")
                .email("hacker@example.com")
                .phone("+919876543219")
                .message("Test <script>evil()</script> <b>bold</b>")
                .build();

        when(leadRepository.findByEmailIgnoreCase("hacker@example.com")).thenReturn(Optional.empty());
        when(leadRepository.save(any(Lead.class))).thenAnswer(i -> {
            Lead saved = i.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        LeadDto dto = leadService.processEnquiry(req, "127.0.0.1");

        ArgumentCaptor<Lead> leadCaptor = ArgumentCaptor.forClass(Lead.class);
        verify(leadRepository).save(leadCaptor.capture());

        Lead savedLead = leadCaptor.getValue();
        assertThat(savedLead.getName()).doesNotContain("<script>");
        assertThat(savedLead.getMessage()).doesNotContain("<script>");
        assertThat(savedLead.getMessage()).contains("&lt;");
    }

    @Test
    @DisplayName("Resilience: Enquiry is saved even if staff notification dispatcher fails")
    void testStaffNotificationResilience() {
        User staff = User.builder()
                .id(UUID.randomUUID())
                .fullName("Front Desk Officer")
                .email("frontdesk@championsclub.com")
                .role(Role.FRONT_DESK)
                .status("ACTIVE")
                .build();

        when(userRepository.findByRoleInAndStatusAndIsDeletedFalseOrderByCreatedAtAsc(any(), eq("ACTIVE")))
                .thenReturn(List.of(staff));
        when(leadRepository.findByEmailIgnoreCase("resilient@example.com")).thenReturn(Optional.empty());
        when(leadRepository.save(any(Lead.class))).thenAnswer(i -> {
            Lead l = i.getArgument(0);
            l.setId(UUID.randomUUID());
            return l;
        });

        // Simulate notification provider explosion
        when(notificationDispatcher.dispatch(any(), any(), any(), any(), any(), any()))
                .thenThrow(new RuntimeException("Mail server socket timeout"));

        PublicEnquiryRequest req = PublicEnquiryRequest.builder()
                .name("Resilient User")
                .email("resilient@example.com")
                .phone("+919888877777")
                .interest("Squash")
                .build();

        LeadDto dto = leadService.processEnquiry(req, "127.0.0.1");

        assertThat(dto).isNotNull();
        assertThat(dto.getEmail()).isEqualTo("resilient@example.com");
        verify(leadRepository).save(any(Lead.class));
    }

    @Test
    @DisplayName("Round-Robin assignment distributes leads evenly among active staff")
    void testRoundRobinStaffAssignment() {
        User staff1 = User.builder().id(UUID.randomUUID()).fullName("Manager Bob").role(Role.MANAGER).status("ACTIVE").build();
        User staff2 = User.builder().id(UUID.randomUUID()).fullName("Desk Alice").role(Role.FRONT_DESK).status("ACTIVE").build();

        when(userRepository.findByRoleInAndStatusAndIsDeletedFalseOrderByCreatedAtAsc(any(), eq("ACTIVE")))
                .thenReturn(List.of(staff1, staff2));

        when(leadRepository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(leadRepository.save(any(Lead.class))).thenAnswer(i -> {
            Lead l = i.getArgument(0);
            l.setId(UUID.randomUUID());
            return l;
        });

        leadService.processEnquiry(PublicEnquiryRequest.builder().name("Person 1").email("p1@test.com").phone("111").build(), "1.1.1.1");
        leadService.processEnquiry(PublicEnquiryRequest.builder().name("Person 2").email("p2@test.com").phone("222").build(), "1.1.1.2");

        ArgumentCaptor<Lead> captor = ArgumentCaptor.forClass(Lead.class);
        verify(leadRepository, times(2)).save(captor.capture());

        List<Lead> savedLeads = captor.getAllValues();
        assertThat(savedLeads.get(0).getAssignedTo()).isNotEqualTo(savedLeads.get(1).getAssignedTo());
    }

    @Test
    @DisplayName("Conversion: Converting a lead that is already an active member throws 400 Conflict")
    void testConvertLeadAlreadyMember() {
        UUID leadId = UUID.randomUUID();
        Lead lead = Lead.builder()
                .id(leadId)
                .name("Existing Member")
                .email("member@example.com")
                .phone("+919111122222")
                .status(LeadStatus.CONTACTED)
                .build();

        when(leadRepository.findById(leadId)).thenReturn(Optional.of(lead));

        Member existingMember = Member.builder()
                .id(UUID.randomUUID())
                .memberNo("CC-1001")
                .email("member@example.com")
                .build();
        when(memberRepository.findByEmailAndIsDeletedFalse("member@example.com"))
                .thenReturn(Optional.of(existingMember));

        ConvertLeadRequest convReq = ConvertLeadRequest.builder().planCode("SILVER").build();

        assertThatThrownBy(() -> leadService.convertLeadToMember(leadId, convReq, null))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("already active in the club: CC-1001");
    }

    @Test
    @DisplayName("Quotation: Expired quote cannot be accepted")
    void testQuoteExpiredCannotBeAccepted() {
        UUID quoteId = UUID.randomUUID();
        Quote expiredQuote = Quote.builder()
                .id(quoteId)
                .leadId(UUID.randomUUID())
                .quoteNumber("QT-2026-9999")
                .lines("[]")
                .status(QuoteStatus.SENT)
                .validUntil(Instant.now().minusSeconds(3600)) // Expired 1 hour ago
                .build();

        when(quoteRepository.findById(quoteId)).thenReturn(Optional.of(expiredQuote));
        when(quoteRepository.save(any(Quote.class))).thenAnswer(i -> i.getArgument(0));

        assertThatThrownBy(() -> quoteService.acceptQuote(quoteId, null))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("expired and can no longer be accepted");
    }
}
