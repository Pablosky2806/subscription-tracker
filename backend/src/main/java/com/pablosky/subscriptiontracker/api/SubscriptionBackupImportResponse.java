package com.pablosky.subscriptiontracker.api;

public record SubscriptionBackupImportResponse(int imported, int skippedExisting) {
}
