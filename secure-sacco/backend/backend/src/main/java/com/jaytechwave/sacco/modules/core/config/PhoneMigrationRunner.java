package com.jaytechwave.sacco.modules.core.config;

import com.jaytechwave.sacco.modules.core.security.PiiSearchHashConverter;
import com.jaytechwave.sacco.modules.core.utils.PhoneUtils;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import com.jaytechwave.sacco.modules.payments.domain.service.CoopEventNormalizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class PhoneMigrationRunner implements CommandLineRunner {

    private final MemberRepository memberRepository;
    private final UserRepository userRepository;
    private final PiiSearchHashConverter piiSearchHashConverter;
    private final CoopEventNormalizer coopEventNormalizer;

    @Override
    public void run(String... args) {
        log.info("Starting Phone Migration Runner...");
        
        List<Member> members = memberRepository.findAll();
        for (Member member : members) {
            if (member.getPhoneNumber() != null) {
                String normalized = PhoneUtils.normalizePhone(member.getPhoneNumber());
                if (normalized != null && !normalized.equals(member.getPhoneNumber())) {
                    log.info("Normalizing phone for member {}: {} -> {}", member.getMemberNumber(), member.getPhoneNumber(), normalized);
                    member.setPhoneNumber(normalized);
                    member.setPhoneNumberHash(piiSearchHashConverter.convertToDatabaseColumn(normalized));
                    memberRepository.save(member);
                }
            }
        }
        
        List<User> users = (List<User>) userRepository.findAll();
        for (User user : users) {
            if (user.getPhoneNumber() != null) {
                String normalized = PhoneUtils.normalizePhone(user.getPhoneNumber());
                if (normalized != null && !normalized.equals(user.getPhoneNumber())) {
                    log.info("Normalizing phone for user {}: {} -> {}", user.getEmail(), user.getPhoneNumber(), normalized);
                    user.setPhoneNumber(normalized);
                    user.setPhoneNumberHash(piiSearchHashConverter.convertToDatabaseColumn(normalized));
                    userRepository.save(user);
                }
            }
        }
        
        log.info("Phone Migration Complete. Re-enriching unmatched payments...");
        int matched = coopEventNormalizer.reEnrichAllUnmatched();
        log.info("Re-enriched {} unmatched payments.", matched);
    }
}
