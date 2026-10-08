package com.championsclub.shop.repo;

import com.championsclub.shop.domain.JobTicketStatus;
import com.championsclub.shop.domain.ServiceJobTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ServiceJobTicketRepository extends JpaRepository<ServiceJobTicket, UUID> {
    Optional<ServiceJobTicket> findByTicketNumber(String ticketNumber);
    List<ServiceJobTicket> findByMemberIdOrderByCreatedAtDesc(UUID memberId);
    List<ServiceJobTicket> findByStatusOrderByCreatedAtDesc(JobTicketStatus status);

    @Query("SELECT t FROM ServiceJobTicket t ORDER BY t.createdAt DESC")
    List<ServiceJobTicket> findAllRecent();

    @Query("SELECT t FROM ServiceJobTicket t WHERE t.loanVariant IS NOT NULL AND t.loanReturned = false")
    List<ServiceJobTicket> findUnreturnedLoans();
}
