package com.championsclub.billing.domain;

import lombok.*;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class InvoiceSequenceId implements Serializable {
    private String financialYear;
    private String sequenceType;
}
