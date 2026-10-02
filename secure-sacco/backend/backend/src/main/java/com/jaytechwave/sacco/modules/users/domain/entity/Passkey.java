package com.jaytechwave.sacco.modules.users.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "passkeys")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Passkey {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "credential_id", nullable = false, unique = true)
    private byte[] credentialId;

    @Column(name = "public_key_cbor", nullable = false)
    private byte[] publicKeyCbor;

    @Column(name = "signature_count", nullable = false)
    private long signatureCount;

    @Column(name = "aaguid")
    private String aaguid;

    @Column(name = "name", nullable = false)
    private String name;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "last_used_at")
    private OffsetDateTime lastUsedAt;
}
