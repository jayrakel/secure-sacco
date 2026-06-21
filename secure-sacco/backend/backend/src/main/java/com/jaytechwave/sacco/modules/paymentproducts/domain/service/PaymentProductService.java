package com.jaytechwave.sacco.modules.paymentproducts.domain.service;

import com.jaytechwave.sacco.modules.accounting.domain.entity.Account;
import com.jaytechwave.sacco.modules.accounting.domain.repository.AccountRepository;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.paymentproducts.api.dto.PaymentProductDTOs.*;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.DepositAllocation;
import com.jaytechwave.sacco.modules.paymentproducts.domain.entity.PaymentProduct;
import com.jaytechwave.sacco.modules.paymentproducts.domain.repository.DepositAllocationRepository;
import com.jaytechwave.sacco.modules.paymentproducts.domain.repository.PaymentProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentProductService {

    private final PaymentProductRepository    productRepository;
    private final AccountRepository           accountRepository;
    private final DepositAllocationRepository allocationRepository;
    private final MemberRepository            memberRepository;

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
                .requiredAmount(request.requiredAmount())
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

        // requiredAmount: explicit clear flag distinguishes "set to uncapped" from "leave unchanged",
        // since requiredAmount(null) in the request body is ambiguous with "field omitted" over JSON.
        if (Boolean.TRUE.equals(request.clearRequiredAmount())) {
            product.setRequiredAmount(null);
        } else if (request.requiredAmount() != null) {
            product.setRequiredAmount(request.requiredAmount());
        }

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

    /**
     * SAC-263: the "smart tab" — works identically for every product, including
     * any new custom one an admin creates, with zero extra code. Reference is read
     * LIVE from the underlying payment every time this is called, so it reflects
     * the M-Pesa ref the moment IPN/mini-statement confirms it — no separate
     * reconciliation step, no risk of a stale frozen copy.
     */
    @Transactional(readOnly = true)
    public ProductTransactionPage getProductTransactions(UUID productId, Pageable pageable) {
        productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + productId));

        Page<DepositAllocation> page = allocationRepository.findByProductIdOrderByCreatedAtDesc(productId, pageable);
        List<ProductTransactionItem> items = toTransactionItems(page.getContent());

        BigDecimal totalAmount = page.getContent().stream()
                .filter(a -> a.getStatus().name().equals("ROUTED"))
                .map(DepositAllocation::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new ProductTransactionPage(
                items, page.getTotalElements(), page.getTotalPages(),
                page.getNumber(), page.getSize(), totalAmount
        );
    }

    /** Full unpaginated history for a product — used to build its standalone statement export. */
    @Transactional(readOnly = true)
    public List<ProductTransactionItem> getProductTransactionsForExport(UUID productId) {
        productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + productId));
        return toTransactionItems(allocationRepository.findByProductIdOrderByCreatedAtAsc(productId));
    }

    private List<ProductTransactionItem> toTransactionItems(List<DepositAllocation> allocations) {
        // Batch-load members to avoid N+1 queries on a long transaction history.
        Map<UUID, Member> membersById = new HashMap<>();
        for (DepositAllocation a : allocations) {
            UUID memberId = a.getPayment().getMemberId();
            if (memberId != null && !membersById.containsKey(memberId)) {
                memberRepository.findById(memberId).ifPresent(m -> membersById.put(memberId, m));
            }
        }

        return allocations.stream().map(a -> {
            Payment payment = a.getPayment();
            Member member = payment.getMemberId() != null ? membersById.get(payment.getMemberId()) : null;
            String reference = payment.getMpesaRef() != null ? payment.getMpesaRef() : payment.getInternalRef();

            return new ProductTransactionItem(
                    a.getId(),
                    member != null ? member.getMemberNumber() : null,
                    member != null ? (member.getFirstName() + " " + member.getLastName()) : "Unknown",
                    a.getAmount(),
                    a.getStatus().name(),
                    reference,
                    a.getCreatedAt(),
                    a.getRoutedAt()
            );
        }).toList();
    }

    private ProductResponse toResponse(PaymentProduct p) {
        return new ProductResponse(
                p.getId(), p.getName(), p.getCode(), p.getDescription(), p.getModuleType(),
                p.getGlAccount().getId(), p.getGlAccount().getAccountCode(), p.getGlAccount().getAccountName(),
                p.isActive(), p.isSystem(), p.getDisplayOrder(), p.getRequiredAmount(), p.getCreatedAt()
        );
    }
}