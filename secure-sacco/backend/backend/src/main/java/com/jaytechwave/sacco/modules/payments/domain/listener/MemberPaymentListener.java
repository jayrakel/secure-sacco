package com.jaytechwave.sacco.modules.members.domain.listener;

import com.jaytechwave.sacco.modules.members.domain.service.MemberService;
import com.jaytechwave.sacco.modules.payments.domain.event.PaymentCompletedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MemberPaymentListener {

    private final MemberService memberService;

    @EventListener
    public void handlePaymentCompleted(PaymentCompletedEvent event) {
        if (event.accountReference() != null && event.accountReference().startsWith("REG-")) {
            log.info("Member Module Event Received: Activating member {}", event.memberId());
            memberService.activateMember(event.memberId());
        }
    }
}