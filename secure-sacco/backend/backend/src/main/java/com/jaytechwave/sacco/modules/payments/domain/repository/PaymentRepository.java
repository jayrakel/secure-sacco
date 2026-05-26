package com.jaytechwave.sacco.modules.payments.domain.repository;

import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.payments.domain.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    Optional<Payment> findByInternalRef(String internalRef);

    Optional<Payment> findByTransactionRef(String transactionRef);

    /** Find the most recent PENDING STK push for a given phone number. */
    @Query("SELECT p FROM Payment p WHERE p.senderPhoneNumber = :phone " +
            "AND p.status = :status " +
            "ORDER BY p.createdAt DESC")
    List<Payment> findBySenderPhoneNumberAndStatus(
            @Param("phone") String phone,
            @Param("status") PaymentStatus status);
}