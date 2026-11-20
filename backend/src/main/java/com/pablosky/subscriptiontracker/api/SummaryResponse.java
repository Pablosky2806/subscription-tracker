package com.pablosky.subscriptiontracker.api;

import java.math.BigDecimal;
import java.util.List;

public record SummaryResponse(List<CurrencyTotals> currencies) {

    public record CurrencyTotals(
            String currency,
            BigDecimal monthlyTotal,
            BigDecimal annualTotal,
            List<CategoryTotals> categories
    ) {
    }

    public record CategoryTotals(
            String category,
            BigDecimal monthlyTotal,
            BigDecimal annualTotal
    ) {
    }
}
