package com.jaytechwave.sacco.modules.members.domain.service;

import com.jaytechwave.sacco.modules.audit.service.SecurityAuditService;
import com.jaytechwave.sacco.modules.members.api.dto.MemberDTOs.*;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.entity.MemberStatus;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.roles.domain.entity.Role;
import com.jaytechwave.sacco.modules.roles.domain.repository.RoleRepository;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.entity.UserStatus;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import com.jaytechwave.sacco.modules.users.domain.service.UserActivationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final MemberNumberGeneratorService numberGeneratorService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserActivationService activationService;
    private final SecurityAuditService securityAuditService;

    @Transactional
    public MemberResponse createMember(CreateMemberRequest request) {
        validateUniqueConstraints(request.getNationalId(), request.getEmail(), request.getPhoneNumber(), null);

        String generatedMemberNumber = numberGeneratorService.generateNextMemberNumber();
        Member member = Member.builder()
                .memberNumber(generatedMemberNumber)
                .firstName(request.getFirstName())
                .middleName(request.getMiddleName())
                .lastName(request.getLastName())
                .nationalId(request.getNationalId())
                .phoneNumber(request.getPhoneNumber())
                .email(request.getEmail())
                .dateOfBirth(request.getDateOfBirth())
                .gender(request.getGender())
                .status(MemberStatus.PENDING)
                .isDeleted(false)
                .build();

        Member savedMember = memberRepository.save(member);

        Role memberRole = roleRepository.findByName("MEMBER")
                .orElseThrow(() -> new IllegalStateException("System 'MEMBER' role not found. Please ensure DB is seeded."));

        User portalUser = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString() + UUID.randomUUID().toString()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .status(UserStatus.PENDING_ACTIVATION)
                .mfaEnabled(false)
                .member(savedMember)
                .roles(Set.of(memberRole))
                .build();

        userRepository.save(portalUser);

        savedMember.setUser(portalUser);
        memberRepository.save(savedMember);
        activationService.initiateActivation(portalUser);

        securityAuditService.logEvent(
                "MEMBER_CREATED",
                savedMember.getMemberNumber(),
                "New member registered: " + savedMember.getFirstName() + " " + savedMember.getLastName()
        );

        return MemberResponse.fromEntity(savedMember);
    }

    @Transactional
    public void activateMember(UUID memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found"));

        if (member.getStatus() != MemberStatus.PENDING) {
            log.warn("Member {} cannot be activated — current status is {}.", member.getMemberNumber(), member.getStatus());
            return;
        }

        member.setStatus(MemberStatus.ACTIVE);
        memberRepository.save(member);

        securityAuditService.logEvent(
                "MEMBER_ACTIVATED",
                member.getMemberNumber(),
                "Member activated after registration fee payment"
        );

        log.info("Member {} has been activated successfully after fee payment.", member.getMemberNumber());
    }

    public Page<MemberResponse> getMembers(String q, MemberStatus status, Pageable pageable) {
        return memberRepository.searchMembers(q, status, pageable).map(MemberResponse::fromEntity);
    }

    public MemberResponse getMemberById(UUID id) {
        return MemberResponse.fromEntity(findMemberEntity(id));
    }

    @Transactional
    public MemberResponse updateMember(UUID id, UpdateMemberRequest request) {
        Member member = findMemberEntity(id);

        validateUniqueConstraints(request.getNationalId(), request.getEmail(), request.getPhoneNumber(), member);

        member.setFirstName(request.getFirstName());
        member.setMiddleName(request.getMiddleName());
        member.setLastName(request.getLastName());
        member.setNationalId(request.getNationalId());
        member.setPhoneNumber(request.getPhoneNumber());
        member.setEmail(request.getEmail());
        member.setDateOfBirth(request.getDateOfBirth());
        member.setGender(request.getGender());

        MemberResponse response = MemberResponse.fromEntity(memberRepository.save(member));

        securityAuditService.logEvent(
                "MEMBER_UPDATED",
                member.getMemberNumber(),
                "Member profile updated"
        );

        return response;
    }

    @Transactional
    public MemberResponse updateStatus(UUID id, MemberStatus newStatus) {
        Member member = findMemberEntity(id);
        MemberStatus previousStatus = member.getStatus();
        member.setStatus(newStatus);
        MemberResponse response = MemberResponse.fromEntity(memberRepository.save(member));

        String action = newStatus == MemberStatus.ACTIVE ? "MEMBER_ACTIVATED" : "MEMBER_DEACTIVATED";
        securityAuditService.logEvent(
                action,
                member.getMemberNumber(),
                "Status changed from " + previousStatus + " to " + newStatus
        );

        return response;
    }

    @Transactional
    public void softDeleteMember(UUID id) {
        Member member = findMemberEntity(id);
        member.setDeleted(true);
        memberRepository.save(member);

        securityAuditService.logEvent(
                "MEMBER_DELETED",
                member.getMemberNumber(),
                "Member soft-deleted"
        );
    }

    private Member findMemberEntity(UUID id) {
        return memberRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Member not found with ID: " + id));
    }

    private void validateUniqueConstraints(String nationalId, String email, String phone, Member currentMember) {
        if (nationalId != null && !nationalId.trim().isEmpty()) {
            if (currentMember == null || !nationalId.equals(currentMember.getNationalId())) {
                if (memberRepository.existsByNationalId(nationalId)) {
                    throw new IllegalArgumentException("National ID is already registered to another member.");
                }
            }
        }

        if (email != null && !email.trim().isEmpty()) {
            if (currentMember == null || !email.equalsIgnoreCase(currentMember.getEmail())) {
                if (memberRepository.existsByEmail(email)) {
                    throw new IllegalArgumentException("Email address is already registered to another member.");
                }
                if (userRepository.existsByEmail(email)) {
                    throw new IllegalArgumentException("Email address is already registered as a system user.");
                }
            }
        }

        if (phone != null && !phone.trim().isEmpty()) {
            if (currentMember == null || !phone.equals(currentMember.getPhoneNumber())) {
                if (memberRepository.existsByPhoneNumber(phone)) {
                    throw new IllegalArgumentException("Phone number is already registered to another member.");
                }
            }
        }
    }
}