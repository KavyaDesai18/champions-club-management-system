package com.championsclub.member.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMemberRequest {
    private String fullName;
    private String phone;
    private String gender;
    private String address;
    private String emergencyContact;
    private String notes;
}
