package com.pablosky.subscriptiontracker.api;

import com.pablosky.subscriptiontracker.persistence.SubscriptionRepository;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {

    private final SubscriptionRepository subscriptionRepository;

    public SubscriptionController(SubscriptionRepository subscriptionRepository) {
        this.subscriptionRepository = subscriptionRepository;
    }

    @GetMapping
    public List<SubscriptionResponse> listSubscriptions() {
        return subscriptionRepository.findAll(Sort.by(Sort.Direction.ASC, "nextChargeDate"))
                .stream()
                .map(entity -> SubscriptionResponse.from(entity.toDomain()))
                .toList();
    }
}
