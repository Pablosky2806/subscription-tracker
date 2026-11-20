package com.pablosky.subscriptiontracker.api;

import com.pablosky.subscriptiontracker.service.UpcomingChargeService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UpcomingChargeControllerTest {

    @Mock
    private UpcomingChargeService upcomingChargeService;

    @InjectMocks
    private UpcomingChargeController upcomingChargeController;

    @Test
    void acceptsMinimumWindow() {
        when(upcomingChargeService.getUpcomingCharges(1)).thenReturn(List.of());

        assertThat(upcomingChargeController.getUpcomingCharges(1)).isEmpty();
        verify(upcomingChargeService).getUpcomingCharges(1);
    }

    @Test
    void acceptsMaximumWindow() {
        when(upcomingChargeService.getUpcomingCharges(365)).thenReturn(List.of());

        assertThat(upcomingChargeController.getUpcomingCharges(365)).isEmpty();
        verify(upcomingChargeService).getUpcomingCharges(365);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 366})
    void rejectsWindowOutsideAllowedRange(int days) {
        assertThatExceptionOfType(ResponseStatusException.class)
                .isThrownBy(() -> upcomingChargeController.getUpcomingCharges(days))
                .satisfies(exception -> assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));

        verifyNoInteractions(upcomingChargeService);
    }
}
