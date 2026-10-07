package com.championsclub.member.refund;

import com.championsclub.member.domain.Membership;

public interface MembershipRefundHook {
    RefundResult calculateAndProcessRefund(Membership membership, String reason, String actor);
}
