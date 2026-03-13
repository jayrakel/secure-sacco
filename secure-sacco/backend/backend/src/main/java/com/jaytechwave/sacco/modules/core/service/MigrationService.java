package com.jaytechwave.sacco.modules.core.service;

import com.jaytechwave.sacco.modules.core.dto.HistoricalMemberRequest;
import com.jaytechwave.sacco.modules.members.api.dto.MemberDTOs.CreateMemberRequest;
import com.jaytechwave.sacco.modules.members.domain.entity.Gender;
import com.jaytechwave.sacco.modules.members.domain.entity.Member;
import com.jaytechwave.sacco.modules.members.domain.repository.MemberRepository;
import com.jaytechwave.sacco.modules.roles.domain.repository.RoleRepository;
import com.jaytechwave.sacco.modules.members.domain.service.MemberService;
import com.jaytechwave.sacco.modules.users.api.dto.UserDTOs.CreateUserRequest;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.entity.UserStatus;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import com.jaytechwave.sacco.modules.users.domain.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MigrationService {

    private final UserService userService;
    private final MemberService memberService;
    private final UserRepository userRepository;
    private final MemberRepository memberRepository;
    private final JdbcTemplate jdbcTemplate;
    private final RoleRepository roleRepository;

    @Transactional
    public String seedHistoricalMember(HistoricalMemberRequest request) {
        log.info("🕰️ Migrating historical member: {} {} (Date: {})", request.firstName(), request.lastName(), request.registrationDate());

        UUID memberRoleId = roleRepository.findByName("MEMBER")
                .orElseThrow(() -> new RuntimeException("MEMBER not found in the database"))
                .getId();

        // 1. Create the User Identity (reverted to standard setters)
        CreateUserRequest userReq = new CreateUserRequest();
        userReq.setFirstName(request.firstName());
        userReq.setLastName(request.lastName());
        userReq.setEmail(request.email());
        userReq.setPhoneNumber(request.phoneNumber());
        userReq.setPassword(request.plainTextPassword());
        userReq.setRoleIds(Set.of(memberRoleId));

        var userResponse = userService.createUser(userReq);

        User user = userRepository.findById(userResponse.getId())
                .orElseThrow(() -> new RuntimeException("User not found after creation"));

        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);

        // 2. Create the Member Profile (reverted to standard setters)
        CreateMemberRequest memberReq = new CreateMemberRequest();
        memberReq.setUserId(user.getId());
        memberReq.setFirstName(request.firstName());
        memberReq.setLastName(request.lastName());
        memberReq.setEmail(request.email());
        memberReq.setPhoneNumber(request.phoneNumber());
        memberReq.setNationalId("MIGRATE-" + user.getId().toString().substring(0, 8));
        memberReq.setDateOfBirth(request.registrationDate().minusYears(30));
        memberReq.setGender(Gender.MALE);

        var memberResponse = memberService.createMember(memberReq);

        // 3. Time Machine
        Timestamp historicalTimestamp = Timestamp.valueOf(request.registrationDate().atStartOfDay());

        jdbcTemplate.update("UPDATE users SET created_at = ? WHERE id = ?", historicalTimestamp, user.getId());
        jdbcTemplate.update("UPDATE members SET joined_date = ?, created_at = ? WHERE id = ?",
                request.registrationDate(), historicalTimestamp, memberResponse.getId());

        log.info("✅ Successfully migrated member {}. Sacco Number: {}", request.email(), memberResponse.getMemberNumber());

        return memberResponse.getMemberNumber();
    }
}