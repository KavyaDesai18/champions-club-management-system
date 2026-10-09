package com.championsclub.bar.repo;

import com.championsclub.bar.domain.KitchenTicket;
import com.championsclub.bar.domain.KitchenTicketStatus;
import com.championsclub.bar.domain.StationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface KitchenTicketRepository extends JpaRepository<KitchenTicket, UUID> {

    Optional<KitchenTicket> findByTicketNumber(String ticketNumber);

    List<KitchenTicket> findAllByTabIdOrderByCreatedAtDesc(UUID tabId);

    List<KitchenTicket> findAllByStationAndStatusNotInOrderByCreatedAtAsc(StationType station, List<KitchenTicketStatus> statuses);

    List<KitchenTicket> findAllByStatusNotInOrderByCreatedAtAsc(List<KitchenTicketStatus> statuses);
}
