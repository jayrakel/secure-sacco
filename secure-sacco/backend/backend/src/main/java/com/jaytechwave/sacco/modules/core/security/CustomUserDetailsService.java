package com.jaytechwave.sacco.modules.core.security;

import com.jaytechwave.sacco.modules.roles.domain.entity.Role;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import com.jaytechwave.sacco.modules.users.domain.entity.UserStatus;
import com.jaytechwave.sacco.modules.users.domain.repository.UserRepository;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;


    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        // 1. Fetch user by email or phone
        User user = userRepository.findByEmailOrPhoneNumber(identifier)
                .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));

        Set<GrantedAuthority> authorities = new HashSet<>();

        // Map Roles AND Permissions to GrantedAuthorities
        user.getRoles().forEach(role -> {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role.getName()));

            // Add individual permissions
            role.getPermissions().forEach(permission ->
                    authorities.add(new SimpleGrantedAuthority(permission.getCode()))
            );
        });

        // Extract pure role names for the frontend payload
        List<String> roleNames = user.getRoles().stream()
                .map(Role::getName)
                .map(name -> "ROLE_" + name)
                .collect(Collectors.toList());

        // 3. Return our customized UserDetails object
        return new CustomUserDetails(
                user.getId(),
                user.getEmail(),
                user.getPasswordHash(),
                user.getFirstName(),
                user.getLastName(),
                roleNames,
                user.getStatus() == UserStatus.ACTIVE,
                true,
                true,
                !user.isDeleted(),
                authorities,
                user.isMfaEnabled()
        );
    }

    // --- NEW: CustomUserDetails inner class ---
    // This allows us to store and retrieve extra fields from the SecurityContext
    @Getter
    public static class CustomUserDetails extends org.springframework.security.core.userdetails.User {

        private final UUID id;
        private final String firstName;
        private final String lastName;
        private final List<String> roles;
        private final boolean mfaEnabled;

        public CustomUserDetails(UUID id, String username, String password,
                                 String firstName, String lastName, List<String> roles,
                                 boolean enabled, boolean accountNonExpired,
                                 boolean credentialsNonExpired, boolean accountNonLocked,
                                 Set<GrantedAuthority> authorities,
                                 boolean mfaEnabled) {

            super(username, password, enabled, accountNonExpired, credentialsNonExpired, accountNonLocked, authorities);
            this.id = id;
            this.firstName = firstName;
            this.lastName = lastName;
            this.roles = roles;
            this.mfaEnabled = mfaEnabled;
        }
    }
}