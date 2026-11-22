package com.pablosky.subscriptiontracker.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MoneyMovementRepository extends JpaRepository<MoneyMovementEntity, UUID> {
    List<MoneyMovementEntity> findAllByOrderByMovementDateDesc();
}
