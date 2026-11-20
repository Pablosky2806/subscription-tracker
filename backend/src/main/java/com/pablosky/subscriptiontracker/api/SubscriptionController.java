package com.pablosky.subscriptiontracker.api;

import com.pablosky.subscriptiontracker.persistence.SubscriptionRepository;
import com.pablosky.subscriptiontracker.persistence.SubscriptionEntity;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.List;
import java.util.UUID;

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

    @GetMapping("/{id}")
    public SubscriptionResponse getSubscription(@PathVariable UUID id) {
        return subscriptionRepository.findById(id)
                .map(entity -> SubscriptionResponse.from(entity.toDomain()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subscription not found"));
    }

    @PostMapping
    public ResponseEntity<SubscriptionResponse> createSubscription(
            @Valid @RequestBody CreateSubscriptionRequest request
    ) {
        var created = subscriptionRepository.save(
                new SubscriptionEntity(request.toDomain())
        ).toDomain();

        return ResponseEntity
                .created(URI.create("/api/subscriptions/" + created.id()))
                .body(SubscriptionResponse.from(created));
    }
}
