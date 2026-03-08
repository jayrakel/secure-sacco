package com.jaytechwave.sacco.modules.members.domain.entity;

import com.jaytechwave.sacco.modules.core.security.EncryptedStringConverter;
import com.jaytechwave.sacco.modules.core.security.PiiSearchHashConverter;
import com.jaytechwave.sacco.modules.users.domain.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "members")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@SQLRestriction("is_deleted = false") // Automatically filters out soft-deleted records globally
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Optional link to a system user account
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "member_number", nullable = false, unique = true, length = 30)
    private String memberNumber;

    @Column(name = "first_name", nullable = false, length = 80)
    private String firstName;

    @Column(name = "middle_name", length = 80)
    private String middleName;

    @Column(name = "last_name", nullable = false, length = 80)
    private String lastName;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "national_id", length = 512)
    private String nationalId;

    @Convert(converter = PiiSearchHashConverter.class)
    @Column(name = "national_id_hash", length = 88)
    private String nationalIdHash;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "phone_number", length = 512)
    private String phoneNumber;

    @Convert(converter = PiiSearchHashConverter.class)
    @Column(name = "phone_number_hash", length = 88)
    private String phoneNumberHash;

    @Column(name = "email", length = 120)
    private String email;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", length = 20)
    private Gender gender;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private MemberStatus status;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (status == null) {
            status = MemberStatus.PENDING;
        }
    }
}