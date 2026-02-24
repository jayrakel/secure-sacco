package com.jaytechwave.sacco.modules.users.domain.service;

import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.roles.domain.repository.RoleRepository;
import com.jaytechwave.sacco.modules.users.domain.entity.UserStatus;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public boolean existsByEmail(String email) {
        if (email == null || email.isBlank()) return false;
        return userRepository.existsByEmail(email.trim().toLowerCase(Locale.ROOT));
    }

    @Transactional
    public User createBootstrapSystemAdmin(
            String firstName,
            String lastName,
            String loginEmail,
            String officialEmail,
            String phoneNumber,
            String rawPassword
    ) {
        String normalizedLoginEmail = normalizeEmail(loginEmail);
        String normalizedOfficialEmail = normalizeEmail(officialEmail);
        String normalizedPhone = normalizePhone(phoneNumber);

        if (userRepository.existsByEmail(normalizedLoginEmail)) {
            throw new IllegalStateException("User already exists with email: " + normalizedLoginEmail);
        }

        if (userRepository.existsByEmail(normalizedOfficialEmail)) {
            throw new IllegalStateException("User already exists with official email: " + normalizedOfficialEmail);
        }

        if (normalizedPhone!= null &&
                userRepository.existsByPhoneNumber(normalizedPhone)) {
            throw new IllegalStateException("User already exists with phone number: " + normalizedPhone);
        }

        var systemAdminRole = roleRepository.findByName("SYSTEM_ADMIN")
                .orElseThrow(() -> new IllegalStateException(
                        "SYSTEM_ADMIN role not found. Ensure V1_1__seed_identity.sql has run successfully."
                ));

        User user = User.builder()
                .firstName(firstName)
                .lastName(lastName)
                .email(normalizedLoginEmail)
                .officialEmail(normalizedOfficialEmail)
                .phoneNumber(phoneNumber)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .status(UserStatus.ACTIVE)
                .isDeleted(false)
                .build();

        user.getRoles().add(systemAdminRole);

        return userRepository.save(user);
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizePhone(String phone) {
        if (phone == null) return null;{
            String value = phone.trim();
            return value.isBlank()? null : value;
        }
    }
}