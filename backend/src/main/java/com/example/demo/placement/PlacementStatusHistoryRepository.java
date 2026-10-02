package com.example.demo.placement;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlacementStatusHistoryRepository extends JpaRepository<PlacementStatusHistory, Long> {

    /** Chronological trail for one placement (insert order == transition order). */
    List<PlacementStatusHistory> findByPlacementIdOrderByIdAsc(Long placementId);
}
