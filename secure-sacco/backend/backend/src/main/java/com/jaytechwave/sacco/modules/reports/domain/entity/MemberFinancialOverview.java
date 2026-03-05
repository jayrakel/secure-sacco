package com.jaytechwave.sacco.modules.reports.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Immutable // Crucial: Prevents Hibernate from tracking this entity for updates!
@Table(name = "v_member_financial_overview")
@Getter
public class MemberFinancialOverview {

    @Id
    @Column(name = "member_id")
    private UUID memberId;

    @Column(name = "member_number")
    private String memberNumber;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    @Column(name = "total_savings")
    private BigDecimal totalSavings;

    @Column(name = "loan_principal")
    private BigDecimal loanPrincipal;

    @Column(name = "loan_interest")
    private BigDecimal loanInterest;

    @Column(name = "loan_arrears")
    private BigDecimal loanArrears;

    @Column(name = "loan_credit")
    private BigDecimal loanCredit;

    @Column(name = "penalty_outstanding")
    private BigDecimal penaltyOutstanding;
}