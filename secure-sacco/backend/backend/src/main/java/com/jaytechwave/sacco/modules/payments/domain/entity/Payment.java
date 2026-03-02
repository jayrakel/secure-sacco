package com.jaytechwave.sacco.modules.payments.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "transaction_ref", unique = true, length = 100)
    private String transactionRef;

    @Column(name = "member_id")
    private UUID memberId;

    @Column(name = "internal_ref", unique = true, nullable = false, length = 100)
    private String internalRef;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(length = 10)
    @Builder.Default
    private String currency = "KES";

    @Column(name = "payment_method", nullable = false, length = 50)
    private String paymentMethod; // e.g., MPESA

    @Column(name = "payment_type", nullable = false, length = 50)
    private String paymentType; // e.g., STK_PUSH

    @Column(name = "account_reference", length = 100)
    private String accountReference;

    @Column(name = "sender_phone_number", length = 20)
    private String senderPhoneNumber;

    @Column(name = "sender_name", length = 150)
    private String senderName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus status;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "provider_metadata", columnDefinition = "jsonb")
    private String providerMetadata; // Storing as JSON string or create a Map

    @Column(name = "failure_reason", columnDefinition = "text")
    private String failureReason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}