package com.pablosky.subscriptiontracker.api;

import com.pablosky.subscriptiontracker.service.UpcomingChargeService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/subscriptions/upcoming")
public class UpcomingChargeController {

    private final UpcomingChargeService upcomingChargeService;

    public UpcomingChargeController(UpcomingChargeService upcomingChargeService) {
        this.upcomingChargeService = upcomingChargeService;
    }

    @GetMapping
    public List<UpcomingChargeResponse> getUpcomingCharges(
            @RequestParam(defaultValue = "30") int days
    ) {
        if (days < 1 || days > 365) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "days must be between 1 and 365");
        }
        return upcomingChargeService.getUpcomingCharges(days);
    }
}
