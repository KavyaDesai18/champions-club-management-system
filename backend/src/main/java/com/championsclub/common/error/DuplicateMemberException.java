package com.championsclub.common.error;

import org.springframework.http.HttpStatus;

public class DuplicateMemberException extends ChampionsClubException {

    private final String existingMemberId;
    private final String existingMemberNo;

    public DuplicateMemberException(String message, String code, String existingMemberId, String existingMemberNo) {
        super(message, HttpStatus.CONFLICT, code);
        this.existingMemberId = existingMemberId;
        this.existingMemberNo = existingMemberNo;
    }

    public String getExistingMemberId() {
        return existingMemberId;
    }

    public String getExistingMemberNo() {
        return existingMemberNo;
    }
}
