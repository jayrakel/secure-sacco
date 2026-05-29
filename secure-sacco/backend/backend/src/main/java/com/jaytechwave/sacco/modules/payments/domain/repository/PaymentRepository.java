package com.jaytechwave.sacco.modules.payments.domain.repository;

import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.payments.domain.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByInternalRef(String internalRef);
    Optional<Payment> findByTransactionRef(String transactionRef);
    Optional<Payment> findBySenderPhoneNumberAndStatus(String senderPhoneNumber, PaymentStatus status);

    // Used by PendingPaymentPollingJob to find all pending STK pushes
    List<Payment> findByStatusAndPaymentType(PaymentStatus status, String paymentType);
}