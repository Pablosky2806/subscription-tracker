package com.pablosky.subscriptiontracker.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SubscriptionBackupImportRequest(
        @NotBlank String format,
        @NotNull @Min(1) Integer version,
        @NotNull @Size(max = 10000) List<@Valid SubscriptionBackupItemRequest> subscriptions
) {
}
