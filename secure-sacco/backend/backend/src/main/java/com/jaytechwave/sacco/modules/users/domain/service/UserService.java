package com.jaytechwave.sacco.modules.users.domain.service;

import com.jaytechwave.sacco.modules.core.service.PasswordValidator;
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
    private final PasswordValidator passwordValidator;

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
        // BE-03: Enforce password policy even for bootstrap users
        validatePasswordPolicy(rawPassword);

        String normalizedLoginEmail = normalizeEmail(loginEmail);
        String normalizedOfficialEmail = normalizeEmail(officialEmail);
        String normalizedPhone = normalizePhone(phoneNumber);

        if (userRepository.existsByEmail(normalizedLoginEmail)) {
            throw new IllegalStateException("User already exists with email: " + normalizedLoginEmail);
        }

        var systemAdminRole = roleRepository.findByName("SYSTEM_ADMIN")
                .orElseThrow(() -> new IllegalStateException("SYSTEM_ADMIN role not found."));

        User user = User.builder()
                .firstName(firstName)
                .lastName(lastName)
                .email(normalizedLoginEmail)
                .officialEmail(normalizedOfficialEmail)
                .phoneNumber(normalizedPhone)
                .passwordHash(passwordEncoder.encode(rawPassword)) // Uses Argon2 bean
                .status(UserStatus.ACTIVE)
                .isDeleted(false)
                .build();

        user.getRoles().add(systemAdminRole);
        return userRepository.save(user);
    }

    @Transactional
    public void createNewUser(User user, String rawPassword) {
        validatePasswordPolicy(rawPassword);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        userRepository.save(user);
    }

    private void validatePasswordPolicy(String rawPassword) {
        if (!passwordValidator.isValid(rawPassword)) {
            throw new IllegalArgumentException(passwordValidator.getRequirementsMessage());
        }
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) throw new IllegalArgumentException("Email is required");
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) return null;
        return phone.trim();
    }
}