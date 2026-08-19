package com.jaytechwave.sacco.modules.shares.api.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public class ShareDTOs {

    public record ShareProductDTO(
            String name,
            String code
    ) {}

    public record ShareAccountDTO(
            UUID id,
            BigDecimal balance,
            String status,
            ShareProductDTO product,
            OffsetDateTime createdAt
    ) {}
    
    public record AdminShareAccountDTO(
            UUID id,
            UUID memberId,
            String memberName,
            String memberNumber,
            BigDecimal balance,
            String status,
            ShareProductDTO product,
            OffsetDateTime createdAt
    ) {}

    public record ShareTransactionDTO(
            UUID id,
            BigDecimal amount,
            String type,
            String reference,
            OffsetDateTime createdAt
    ) {}
}
