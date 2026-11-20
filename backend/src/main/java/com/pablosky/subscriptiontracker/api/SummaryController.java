package com.pablosky.subscriptiontracker.api;

import com.pablosky.subscriptiontracker.service.SubscriptionSummaryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/summary")
public class SummaryController {

    private final SubscriptionSummaryService summaryService;

    public SummaryController(SubscriptionSummaryService summaryService) {
        this.summaryService = summaryService;
    }

    @GetMapping
    public SummaryResponse getSummary() {
        return summaryService.getSummary();
    }
}
