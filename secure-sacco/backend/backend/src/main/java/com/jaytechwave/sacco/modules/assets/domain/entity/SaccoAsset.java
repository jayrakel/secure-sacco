package com.jaytechwave.sacco.modules.assets.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.UUID;

/**
 * Represents a SACCO-owned fixed asset.
 *
 * <p>Assets are NEVER deleted. Lifecycle is managed via {@link AssetStatus} only.
 * Every acquisition automatically triggers a GL journal entry via
 * {@code JournalEntryService.postAssetAcquisition()}.
 *
 * <p>GL entry on registration:
 * <pre>
 *   DR {glAccountCode}  (Fixed Asset account from category)  ← asset acquired
 *   CR 1110             (Bank / Cash on Hand)                 ← cash paid out
 * </pre>
 */
@Entity
@Table(name = "sacco_assets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaccoAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Descriptive name of the asset (e.g., "HP LaserJet Pro M404n"). */
    @Column(name = "asset_name", nullable = false, length = 200)
    private String assetName;

    /** Category determines the GL account debited on acquisition. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private AssetCategory category;

    /** Current lifecycle status. Defaults to ACTIVE on registration. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private AssetStatus status = AssetStatus.ACTIVE;

    /** Manufacturer or model serial number for physical identification. */
    @Column(name = "serial_number", length = 100)
    private String serialNumber;

    /** Optional longer description of the asset. */
    @Column(columnDefinition = "text")
    private String description;

    /** Date the asset was purchased / received. */
    @Column(name = "purchase_date", nullable = false)
    private LocalDate purchaseDate;

    /** Original cost of the asset (must be > 0). */
    @Column(name = "purchase_cost", nullable = false, precision = 19, scale = 4)
    private BigDecimal purchaseCost;

    /**
     * GL account code that was debited on acquisition.
     * Derived from {@link AssetCategory#getGlAccountCode()} at registration time.
     */
    @Column(name = "gl_account_code", nullable = false, length = 10)
    private String glAccountCode;

    /**
     * Journal entry reference for the acquisition posting (format: ASSET-{id}).
     * Null if the GL post was skipped (idempotency guard triggered).
     */
    @Column(name = "journal_reference", length = 100, unique = true)
    private String journalReference;

    /** Physical or logical location of the asset (e.g., "Head Office - Finance Room"). */
    @Column(length = 200)
    private String location;

    /** Name of the vendor or supplier the asset was purchased from. */
    @Column(length = 200)
    private String supplier;

    /** Warranty expiry date — for maintenance scheduling. */
    @Column(name = "warranty_expiry")
    private LocalDate warrantyExpiry;

    /** Timestamp when the asset was disposed or written off. Null while ACTIVE. */
    @Column(name = "disposed_at")
    private ZonedDateTime disposedAt;

    /** Reason or notes recorded at the time of disposal or write-off. */
    @Column(name = "disposal_notes", columnDefinition = "text")
    private String disposalNotes;

    /** User (Treasurer/Admin) who registered this asset. */
    @Column(name = "created_by_user_id", nullable = false)
    private UUID createdByUserId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}
