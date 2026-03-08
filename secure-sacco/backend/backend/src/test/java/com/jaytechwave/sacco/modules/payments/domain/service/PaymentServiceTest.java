package com.jaytechwave.sacco.modules.payments.domain.service;

import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.payments.api.dto.DarajaDTOs.*;
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
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PaymentService — M-Pesa STK Callback Handling")
class PaymentServiceTest {

    @Mock DarajaApiService darajaApiService;
    @Mock PaymentRepository paymentRepository;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock SecurityAuditService securityAuditService;

    @InjectMocks
    private PaymentService service;

    private static final String CHECKOUT_ID = "ws_CO_2026010600001";
    private UUID memberId;
    private Payment pendingPayment;

    @BeforeEach
    void setUp() {
        memberId = UUID.randomUUID();

        pendingPayment = Payment.builder()
                .id(UUID.randomUUID())
                .memberId(memberId)
                .internalRef(CHECKOUT_ID)
                .amount(new BigDecimal("1000.00"))
                .paymentMethod("MPESA")
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
        when(paymentRepository.findByInternalRef(CHECKOUT_ID)).thenReturn(Optional.of(pendingPayment));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        StkCallbackResponse callback = buildSuccessfulCallback(CHECKOUT_ID, "PGS123456789");

        service.processStkCallback("{}", callback);

        assertThat(pendingPayment.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        assertThat(pendingPayment.getTransactionRef()).isEqualTo("PGS123456789");

        ArgumentCaptor<PaymentCompletedEvent> eventCaptor = ArgumentCaptor.forClass(PaymentCompletedEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        assertThat(eventCaptor.getValue().memberId()).isEqualTo(memberId);
        assertThat(eventCaptor.getValue().amount()).isEqualByComparingTo(new BigDecimal("1000.00"));
    }

    @Test
    @DisplayName("failed callback marks payment FAILED and stores reason")
    void processStkCallback_failure_marksFailedWithReason() {
        when(paymentRepository.findByInternalRef(CHECKOUT_ID)).thenReturn(Optional.of(pendingPayment));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        StkCallbackResponse callback = buildFailedCallback(CHECKOUT_ID, "Request cancelled by user");

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

        when(paymentRepository.findByInternalRef(CHECKOUT_ID)).thenReturn(Optional.of(pendingPayment));

        StkCallbackResponse callback = buildSuccessfulCallback(CHECKOUT_ID, "PGS222222222");

        service.processStkCallback("{}", callback);

        // Receipt number must NOT be overwritten
        assertThat(pendingPayment.getTransactionRef()).isEqualTo("PGS111111111");

        // No duplicate event must be fired
        verify(eventPublisher, never()).publishEvent(any(PaymentCompletedEvent.class));

        // No re-save
        verify(paymentRepository, never()).save(any());
    }

    @Test
    @DisplayName("duplicate FAILED callback for already-FAILED payment is a no-op")
    void processStkCallback_duplicateFailure_isIdempotent() {
        pendingPayment.setStatus(PaymentStatus.FAILED);
        pendingPayment.setFailureReason("First failure reason");

        when(paymentRepository.findByInternalRef(CHECKOUT_ID)).thenReturn(Optional.of(pendingPayment));

        StkCallbackResponse callback = buildFailedCallback(CHECKOUT_ID, "Second failure attempt");

        service.processStkCallback("{}", callback);

        // Failure reason must NOT be overwritten
        assertThat(pendingPayment.getFailureReason()).isEqualTo("First failure reason");
        verify(paymentRepository, never()).save(any());
    }

    // ─── Phone number normalization ────────────────────────────────────

    @Test
    @DisplayName("phone starting with + is normalized to international format")
    void initiateStkPush_plusPrefixNormalized() {
        when(darajaApiService.initiateStkPush(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(buildStkPushResponse());
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.initiateMpesaStkPush(
                new InitiateStkRequest("+254700123456", new BigDecimal("500.00"), "REF-001"),
                memberId
        );

        verify(darajaApiService).initiateStkPush(eq("254700123456"), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("phone starting with 0 is converted to 254 prefix")
    void initiateStkPush_zeroPrefixNormalized() {
        when(darajaApiService.initiateStkPush(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(buildStkPushResponse());
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.initiateMpesaStkPush(
                new InitiateStkRequest("0712345678", new BigDecimal("500.00"), "REF-002"),
                memberId
        );

        verify(darajaApiService).initiateStkPush(eq("254712345678"), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("daraja API error throws RuntimeException — no payment saved")
    void initiateStkPush_darajaError_throwsAndNoPaymentSaved() {
        StkPushSyncResponse errorResponse = new StkPushSyncResponse();
        errorResponse.setResponseCode("1");
        errorResponse.setResponseDescription("Insufficient permissions");

        when(darajaApiService.initiateStkPush(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(errorResponse);

        assertThatThrownBy(() -> service.initiateMpesaStkPush(
                new InitiateStkRequest("254700000001", new BigDecimal("500.00"), "REF-003"),
                memberId
        )).isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to initiate");

        verify(paymentRepository, never()).save(any());
    }

    // ─── Helpers ──────────────────────────────────────────────────────

    private StkCallbackResponse buildSuccessfulCallback(String checkoutId, String receiptNumber) {
        StkCallbackResponse.Item receiptItem = new StkCallbackResponse.Item();
        receiptItem.setName("MpesaReceiptNumber");
        receiptItem.setValue(receiptNumber);

        StkCallbackResponse.CallbackMetadata metadata = new StkCallbackResponse.CallbackMetadata();
        metadata.setItem(List.of(receiptItem));

        StkCallbackResponse.StkCallback callback = new StkCallbackResponse.StkCallback();
        callback.setCheckoutRequestID(checkoutId);
        callback.setResultCode(0);
        callback.setResultDesc("The service request is processed successfully.");
        callback.setCallbackMetadata(metadata);

        StkCallbackResponse.Body body = new StkCallbackResponse.Body();
        body.setStkCallback(callback);

        StkCallbackResponse response = new StkCallbackResponse();
        response.setBody(body);
        return response;
    }

    private StkCallbackResponse buildFailedCallback(String checkoutId, String reason) {
        StkCallbackResponse.StkCallback callback = new StkCallbackResponse.StkCallback();
        callback.setCheckoutRequestID(checkoutId);
        callback.setResultCode(1032);
        callback.setResultDesc(reason);

        StkCallbackResponse.Body body = new StkCallbackResponse.Body();
        body.setStkCallback(callback);

        StkCallbackResponse response = new StkCallbackResponse();
        response.setBody(body);
        return response;
    }

    private StkPushSyncResponse buildStkPushResponse() {
        StkPushSyncResponse r = new StkPushSyncResponse();
        r.setResponseCode("0");
        r.setResponseDescription("Success");
        r.setCheckoutRequestID(CHECKOUT_ID);
        r.setCustomerMessage("Please enter your M-Pesa PIN");
        return r;
    }
}