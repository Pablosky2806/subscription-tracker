package com.pablosky.subscriptiontracker.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.AssertTrue;

import java.util.List;

public record SubscriptionBackupImportRequest(
        @NotBlank String format,
        @NotNull @Min(1) Integer version,
        @NotNull @Size(max = 10000) List<@Valid SubscriptionBackupItemRequest> subscriptions,
        @Size(max = 100000) List<@Valid MoneyMovementBackupItemRequest> movements
) {

    @AssertTrue(message = "Version 2 backups must include movements; version 1 backups cannot include them")
    public boolean isMovementListValidForVersion() {
        if (version == null) return true;
        if (version == 2) return movements != null;
        return version != 1 || movements == null || movements.isEmpty();
    }
}
