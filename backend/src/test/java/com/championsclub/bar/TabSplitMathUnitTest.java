package com.championsclub.bar;

import com.championsclub.bar.domain.*;
import com.championsclub.bar.dto.SplitBillRequest;
import com.championsclub.bar.dto.TabSplitDto;
import com.championsclub.bar.repo.*;
import com.championsclub.bar.service.*;
import com.championsclub.billing.service.PaymentService;
import com.championsclub.member.repo.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mockito;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class TabSplitMathUnitTest {

    private TabRepository tabRepository;
    private TabItemRepository tabItemRepository;
    private BarTableRepository tableRepository;
    private MenuItemRepository menuItemRepository;
    private KitchenTicketRepository kitchenTicketRepository;
    private KitchenTicketItemRepository kitchenTicketItemRepository;
    private TabSplitRepository tabSplitRepository;
    private MemberRepository memberRepository;
    private ShiftService shiftService;
    private KitchenDisplayService kitchenDisplayService;
    private PaymentService paymentService;
    private JdbcTemplate jdbcTemplate;

    private TabService tabService;

    @BeforeEach
    void setUp() {
        tabRepository = Mockito.mock(TabRepository.class);
        tabItemRepository = Mockito.mock(TabItemRepository.class);
        tableRepository = Mockito.mock(BarTableRepository.class);
        menuItemRepository = Mockito.mock(MenuItemRepository.class);
        kitchenTicketRepository = Mockito.mock(KitchenTicketRepository.class);
        kitchenTicketItemRepository = Mockito.mock(KitchenTicketItemRepository.class);
        tabSplitRepository = Mockito.mock(TabSplitRepository.class);
        memberRepository = Mockito.mock(MemberRepository.class);
        shiftService = Mockito.mock(ShiftService.class);
        kitchenDisplayService = Mockito.mock(KitchenDisplayService.class);
        paymentService = Mockito.mock(PaymentService.class);
        jdbcTemplate = Mockito.mock(JdbcTemplate.class);

        when(tabSplitRepository.save(any(TabSplit.class))).thenAnswer(inv -> inv.getArgument(0));

        tabService = new TabService(
                tabRepository,
                tabItemRepository,
                tableRepository,
                menuItemRepository,
                kitchenTicketRepository,
                kitchenTicketItemRepository,
                tabSplitRepository,
                memberRepository,
                shiftService,
                kitchenDisplayService,
                paymentService,
                jdbcTemplate
        );
    }

    @ParameterizedTest(name = "Total {0} split {1} ways: sum of splits must match total exactly")
    @CsvSource({
            "100.00, 3, 33.34, 33.33, 33.33",
            "10.00, 3, 3.34, 3.33, 3.33",
            "50.00, 4, 12.50, 12.50, 12.50",
            "77.77, 2, 38.89, 38.88, 0.00",
            "125.45, 5, 25.09, 25.09, 25.09",
            "1.00, 3, 0.34, 0.33, 0.33"
    })
    @DisplayName("Table-driven table split rounding math preserves exact total down to the cent/paise")
    void testEqualSplitPennyExactMath(String totalStr, int splitCount, String expectedFirst, String expectedSecond, String expectedThird) {
        BigDecimal total = new BigDecimal(totalStr);
        UUID tabId = UUID.randomUUID();

        TabItem item = TabItem.builder()
                .id(UUID.randomUUID())
                .itemName("Sample Item")
                .unitPrice(total)
                .qty(1)
                .lineTotal(total)
                .status(TabItemStatus.NEW)
                .build();

        Tab tab = Tab.builder()
                .id(tabId)
                .tabNumber("TAB-101")
                .status(TabStatus.OPEN)
                .totalAmount(total)
                .items(List.of(item))
                .build();

        when(tabRepository.findById(tabId)).thenReturn(Optional.of(tab));

        SplitBillRequest req = SplitBillRequest.builder()
                .splitType(SplitType.EQUAL)
                .splitCount(splitCount)
                .build();

        List<TabSplitDto> splits = tabService.splitBill(tabId, req);

        assertThat(splits).hasSize(splitCount);

        // Verify the sum of all split parts strictly equals total amount
        BigDecimal sum = splits.stream().map(TabSplitDto::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(sum).isEqualByComparingTo(total);

        // Verify first split has remainder penny if uneven
        assertThat(splits.get(0).getAmount()).isEqualByComparingTo(new BigDecimal(expectedFirst));
        if (splitCount >= 2) {
            assertThat(splits.get(1).getAmount()).isEqualByComparingTo(new BigDecimal(expectedSecond));
        }
        if (splitCount >= 3) {
            assertThat(splits.get(2).getAmount()).isEqualByComparingTo(new BigDecimal(expectedThird));
        }
    }
}
