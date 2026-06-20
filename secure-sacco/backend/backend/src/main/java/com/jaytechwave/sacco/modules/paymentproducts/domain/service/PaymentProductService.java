package com.jaytechwave.sacco.modules.paymentproducts.domain.service;

import com.jaytechwave.sacco.modules.accounting.domain.entity.Account;
import com.jaytechwave.sacco.modules.accounting.domain.repository.AccountRepository;
import com.jaytechwave.sacco.modules.paymentproducts.api.dto.PaymentProductDTOs.*;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.PaymentProduct;
import com.jaytechwave.sacco.modules.paymentproducts.domain.repository.PaymentProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentProductService {

    private final PaymentProductRepository productRepository;
    private final AccountRepository        accountRepository;

    @Transactional(readOnly = true)
    public List<ProductResponse> getAllProducts() {
        return productRepository.findAll().stream()
                .sorted((a, b) -> Integer.compare(a.getDisplayOrder(), b.getDisplayOrder()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getActiveProducts() {
        return productRepository.findByIsActiveTrueOrderByDisplayOrderAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ProductResponse createProduct(CreateProductRequest request) {
        if (productRepository.existsByCode(request.code())) {
            throw new IllegalArgumentException("A product with code '" + request.code() + "' already exists");
        }
        Account glAccount = accountRepository.findById(request.glAccountId())
                .orElseThrow(() -> new IllegalArgumentException("GL account not found: " + request.glAccountId()));

        PaymentProduct product = PaymentProduct.builder()
                .name(request.name())
                .code(request.code().toUpperCase().replace(" ", "_"))
                .description(request.description())
                .moduleType(request.moduleType())
                .glAccount(glAccount)
                .isActive(true)
                .isSystem(false)
                .displayOrder(request.displayOrder() != null ? request.displayOrder() : nextDisplayOrder())
                .build();

        product = productRepository.save(product);
        log.info("Created payment product '{}' ({}) → GL {}", product.getName(), product.getCode(),
                glAccount.getAccountCode());
        return toResponse(product);
    }

    @Transactional
    public ProductResponse updateProduct(UUID id, UpdateProductRequest request) {
        PaymentProduct product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + id));

        if (request.name() != null) product.setName(request.name());
        if (request.description() != null) product.setDescription(request.description());
        if (request.glAccountId() != null) {
            Account glAccount = accountRepository.findById(request.glAccountId())
                    .orElseThrow(() -> new IllegalArgumentException("GL account not found: " + request.glAccountId()));
            product.setGlAccount(glAccount);
        }
        if (request.isActive() != null) {
            if (product.isSystem() && !request.isActive()) {
                throw new IllegalStateException("System products (Savings, Penalty, Loan) cannot be deactivated");
            }
            product.setActive(request.isActive());
        }
        if (request.displayOrder() != null) product.setDisplayOrder(request.displayOrder());

        product = productRepository.save(product);
        return toResponse(product);
    }

    @Transactional
    public void deleteProduct(UUID id) {
        PaymentProduct product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + id));
        if (product.isSystem()) {
            throw new IllegalStateException("System products (Savings, Penalty, Loan) cannot be deleted");
        }
        productRepository.delete(product);
    }

    private int nextDisplayOrder() {
        return productRepository.findAll().stream()
                .mapToInt(PaymentProduct::getDisplayOrder)
                .max().orElse(0) + 1;
    }

    private ProductResponse toResponse(PaymentProduct p) {
        return new ProductResponse(
                p.getId(), p.getName(), p.getCode(), p.getDescription(), p.getModuleType(),
                p.getGlAccount().getId(), p.getGlAccount().getAccountCode(), p.getGlAccount().getAccountName(),
                p.isActive(), p.isSystem(), p.getDisplayOrder(), p.getCreatedAt()
        );
    }
}