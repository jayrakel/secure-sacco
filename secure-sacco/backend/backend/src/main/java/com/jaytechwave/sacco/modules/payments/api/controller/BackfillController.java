package com.jaytechwave.sacco.modules.payments.api.controller;

import com.jaytechwave.sacco.modules.payments.domain.entity.Payment;
import com.jaytechwave.sacco.modules.payments.domain.entity.PaymentStatus;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentReceiptUpdatedEvent;
import com.jaytechwave.sacco.modules.payments.domain.repository.PaymentRepository;
import com.jaytechwave.sacco.modules.payments.domain.entity.CoopTransaction;
import com.jaytechwave.sacco.modules.payments.domain.repository.CoopTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/v1/public/backfill")
@RequiredArgsConstructor
public class BackfillController {

    private final PaymentRepository paymentRepository;
    private final CoopTransactionRepository coopTransactionRepository;
    private final ApplicationEventPublisher eventPublisher;

    @GetMapping("/sms")
    public String triggerMissingSms() {
        List<Payment> payments = paymentRepository.findAll();
        int count = 0;
        for (Payment p : payments) {
            if (p.getStatus() == PaymentStatus.COMPLETED 
                && "STK_PUSH".equals(p.getPaymentType()) 
                && p.getMpesaRef() != null 
                && p.getMpesaRef().length() > 15) {
                
                log.info("Found STK push missing real M-Pesa receipt: paymentId={} internalRef={}", p.getId(), p.getInternalRef());
                
                // Match by internalRef (which is MessageReference and also saved as MpesaRef in some fallback STK cases)
                // Wait, if it's the MessageReference, let's just find by mpesaRef since IPN sets it there if it comes later.
                Optional<CoopTransaction> ctOpt = coopTransactionRepository.findByMpesaRef(p.getInternalRef());
                
                String finalRef = p.getInternalRef() != null && p.getInternalRef().length() > 8 
                                    ? p.getInternalRef().substring(0, 8).toUpperCase() 
                                    : "N/A";
                                    
                if (ctOpt.isPresent()) {
                    CoopTransaction ct = ctOpt.get();
                    if (ct.getMpesaRef() != null && ct.getMpesaRef().length() <= 15) {
                        finalRef = ct.getMpesaRef();
                        log.info("Found matching CoopTransaction! Updating payment {} to true receipt {}", p.getId(), finalRef);
                        
                        p.setMpesaRef(finalRef);
                        paymentRepository.save(p);
                    }
                } else {
                    log.warn("Could not find matching CoopTransaction for internalRef: {}. Using truncated internal ref for SMS.", p.getInternalRef());
                    // Update to the truncated ref so it doesn't get picked up again
                    p.setMpesaRef(finalRef);
                    paymentRepository.save(p);
                }
                
                eventPublisher.publishEvent(new PaymentReceiptUpdatedEvent(
                    p.getId(), p.getMemberId(), p.getAmount(), p.getAccountReference(), p.getInternalRef(), finalRef
                ));
                count++;
            }
        }
        return "Triggered SMS for " + count + " STK pushes.";
    }
}
