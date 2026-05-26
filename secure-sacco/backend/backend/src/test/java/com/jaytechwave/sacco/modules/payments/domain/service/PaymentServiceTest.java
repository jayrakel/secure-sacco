package com.jaytechwave.sacco.modules.payments.domain.service;

import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.payments.api.dto.CoopConnectDTOs.*;
import com.jaytechwave.sacco.modules.payments.api.dto.PaymentDTOs.InitiateStkRequest;
import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.payments.domain.entity.PaymentStatus;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentCompletedEvent;
import com.jaytechwave.sacco.modules.payments.domain.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PaymentService — Co-op Connect STK Callback Handling")
class PaymentServiceTest {

    @Mock CoopConnectService    coopConnectService;
    @Mock PaymentRepository     paymentRepository;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock SecurityAuditService  securityAuditService;

    @InjectMocks
    private PaymentService service;

    private static final String MESSAGE_REF = "abc123def456ghi789jk"; // 20-char ref
    private UUID memberId;
    private Payment pendingPayment;

    @BeforeEach
    void setUp() {
        memberId = UUID.randomUUID();

        pendingPayment = Payment.builder()
                .id(UUID.randomUUID())
                .memberId(memberId)
                .internalRef(MESSAGE_REF)
                .amount(new BigDecimal("1000.00"))
                .paymentMethod("MPESA_COOP")
                .paymentType("STK_PUSH")
                .accountReference("DEP-ABCD1234")
                .senderPhoneNumber("254700000001")
                .status(PaymentStatus.PENDING)
                .build();
    }

    // ─── processStkCallback — success path ────────────────────────────

    @Test
    @DisplayName("successful callback marks payment COMPLETED and fires event")
    void processStkCallback_success_marksCompletedAndFiresEvent() {
        when(paymentRepository.findByInternalRef(MESSAGE_REF)).thenReturn(Optional.of(pendingPayment));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        StkCallbackPayload callback = buildSuccessfulCallback(MESSAGE_REF, "PGS123456789");

        service.processStkCallback("{}", callback);

        assertThat(pendingPayment.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        assertThat(pendingPayment.getTransactionRef()).isEqualTo("PGS123456789");

        ArgumentCaptor<PaymentCompletedEvent> captor = ArgumentCaptor.forClass(PaymentCompletedEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        assertThat(captor.getValue().memberId()).isEqualTo(memberId);
        assertThat(captor.getValue().amount()).isEqualByComparingTo(new BigDecimal("1000.00"));
    }

    @Test
    @DisplayName("failed callback marks payment FAILED and stores reason")
    void processStkCallback_failure_marksFailedWithReason() {
        when(paymentRepository.findByInternalRef(MESSAGE_REF)).thenReturn(Optional.of(pendingPayment));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        StkCallbackPayload callback = buildFailedCallback(MESSAGE_REF, "Request cancelled by user");

        service.processStkCallback("{}", callback);

        assertThat(pendingPayment.getStatus()).isEqualTo(PaymentStatus.FAILED);
        assertThat(pendingPayment.getFailureReason()).contains("cancelled by user");
        verify(eventPublisher, never()).publishEvent(any(PaymentCompletedEvent.class));
    }

    // ─── Idempotency — duplicate callbacks must be no-ops ─────────────

    @Test
    @DisplayName("duplicate SUCCESS callback for already-COMPLETED payment is a no-op")
    void processStkCallback_duplicateSuccess_isIdempotent() {
        pendingPayment.setStatus(PaymentStatus.COMPLETED);
        pendingPayment.setTransactionRef("PGS111111111");

        when(paymentRepository.findByInternalRef(MESSAGE_REF)).thenReturn(Optional.of(pendingPayment));

        StkCallbackPayload callback = buildSuccessfulCallback(MESSAGE_REF, "PGS222222222");

        service.processStkCallback("{}", callback);

        // Receipt number must NOT be overwritten
        assertThat(pendingPayment.getTransactionRef()).isEqualTo("PGS111111111");
        verify(eventPublisher, never()).publishEvent(any(PaymentCompletedEvent.class));
        verify(paymentRepository, never()).save(any());
    }

    @Test
    @DisplayName("duplicate FAILED callback for already-FAILED payment is a no-op")
    void processStkCallback_duplicateFailure_isIdempotent() {
        pendingPayment.setStatus(PaymentStatus.FAILED);
        pendingPayment.setFailureReason("First failure reason");

        when(paymentRepository.findByInternalRef(MESSAGE_REF)).thenReturn(Optional.of(pendingPayment));

        StkCallbackPayload callback = buildFailedCallback(MESSAGE_REF, "Second failure attempt");

        service.processStkCallback("{}", callback);

        assertThat(pendingPayment.getFailureReason()).isEqualTo("First failure reason");
        verify(paymentRepository, never()).save(any());
    }

    // ─── Phone number normalization ────────────────────────────────────

    @Test
    @DisplayName("phone starting with + is normalized to international format")
    void initiateStkPush_plusPrefixNormalized() {
        when(coopConnectService.initiateStkPush(anyString(), any(), anyString(), anyString()))
                .thenReturn(buildStkPushResponse());
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.initiateMpesaStkPush(
                new InitiateStkRequest("+254700123456", new BigDecimal("500.00"), "REF-001"),
                memberId
        );

        verify(coopConnectService).initiateStkPush(
                eq("254700123456"), any(), anyString(), anyString()
        );
    }

    @Test
    @DisplayName("phone starting with 0 is converted to 254 prefix")
    void initiateStkPush_zeroPrefixNormalized() {
        when(coopConnectService.initiateStkPush(anyString(), any(), anyString(), anyString()))
                .thenReturn(buildStkPushResponse());
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.initiateMpesaStkPush(
                new InitiateStkRequest("0712345678", new BigDecimal("500.00"), "REF-002"),
                memberId
        );

        verify(coopConnectService).initiateStkPush(
                eq("254712345678"), any(), anyString(), anyString()
        );
    }

    @Test
    @DisplayName("Co-op API error response throws RuntimeException — no payment saved")
    void initiateStkPush_coopError_throwsAndNoPaymentSaved() {
        StkPushResponse errorResponse = new StkPushResponse();
        errorResponse.setMessageCode("500");
        errorResponse.setMessageDescription("Insufficient permissions");

        when(coopConnectService.initiateStkPush(anyString(), any(), anyString(), anyString()))
                .thenReturn(errorResponse);

        assertThatThrownBy(() -> service.initiateMpesaStkPush(
                new InitiateStkRequest("254700000001", new BigDecimal("500.00"), "REF-003"),
                memberId
        )).isInstanceOf(RuntimeException.class)
                .hasMessageContaining("failed");

        verify(paymentRepository, never()).save(any());
    }

    // ─── Helpers ──────────────────────────────────────────────────────

    private StkCallbackPayload buildSuccessfulCallback(String messageRef, String transactionId) {
        StkCallbackPayload p = new StkCallbackPayload();
        p.setMessageReference(messageRef);
        p.setMessageCode("0");
        p.setMessageDescription("The service request is processed successfully.");
        p.setTransactionId(transactionId);
        p.setAmount("1000.00");
        return p;
    }

    private StkCallbackPayload buildFailedCallback(String messageRef, String reason) {
        StkCallbackPayload p = new StkCallbackPayload();
        p.setMessageReference(messageRef);
        p.setMessageCode("1032");
        p.setMessageDescription(reason);
        return p;
    }

    private StkPushResponse buildStkPushResponse() {
        StkPushResponse r = new StkPushResponse();
        r.setMessageCode("0");
        r.setMessageDescription("Success");
        r.setMessageReference(MESSAGE_REF);
        return r;
    }
}