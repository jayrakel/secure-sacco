package com.jaytechwave.sacco.modules.paymentproducts.domain.repository;

import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.PaymentProduct;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentProductRepository extends JpaRepository<PaymentProduct, UUID> {

    List<PaymentProduct> findByIsActiveTrueOrderByDisplayOrderAsc();

    Optional<PaymentProduct> findByCode(String code);

    List<PaymentProduct> findByModuleType(com.jaytechwave.sacco.modules.paymentproducts.domain.entity.ModuleType moduleType);

    boolean existsByCode(String code);
}