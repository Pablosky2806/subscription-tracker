package com.pablosky.subscriptiontracker.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record MoneyMovementImportRequest(
        @NotNull @Size(max = 5000) List<@Valid MoneyMovementWriteRequest> movements
) {
}
