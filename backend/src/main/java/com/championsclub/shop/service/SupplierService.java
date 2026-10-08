package com.championsclub.shop.service;

import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.shop.domain.Supplier;
import com.championsclub.shop.domain.SupplierBill;
import com.championsclub.shop.dto.SupplierBillDto;
import com.championsclub.shop.dto.SupplierDto;
import com.championsclub.shop.repo.SupplierBillRepository;
import com.championsclub.shop.repo.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final SupplierBillRepository supplierBillRepository;

    @Transactional(readOnly = true)
    public List<SupplierDto> getAllSuppliers() {
        return supplierRepository.findByActiveTrueOrderByNameAsc().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SupplierDto getSupplierById(UUID id) {
        Supplier s = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found: " + id));
        return mapToDto(s);
    }

    @Transactional
    public SupplierDto createSupplier(SupplierDto.CreateRequest request) {
        if (supplierRepository.findByNameIgnoreCase(request.getName().trim()).isPresent()) {
            throw new BusinessValidationException("Supplier with name '" + request.getName() + "' already exists", "DUPLICATE_SUPPLIER");
        }

        Supplier supplier = Supplier.builder()
                .name(request.getName().trim())
                .contactName(request.getContactName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .address(request.getAddress())
                .paymentTerms(request.getPaymentTerms() != null ? request.getPaymentTerms() : "NET_30")
                .active(request.getActive() != null ? request.getActive() : true)
                .build();

        return mapToDto(supplierRepository.save(supplier));
    }

    @Transactional(readOnly = true)
    public List<SupplierBillDto> getAllBills() {
        return supplierBillRepository.findAll().stream()
                .map(this::mapBillToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalAccountsPayable() {
        return supplierBillRepository.calculateTotalUnpaidBills();
    }

    private SupplierDto mapToDto(Supplier s) {
        return SupplierDto.builder()
                .id(s.getId())
                .name(s.getName())
                .contactName(s.getContactName())
                .email(s.getEmail())
                .phone(s.getPhone())
                .address(s.getAddress())
                .paymentTerms(s.getPaymentTerms())
                .active(s.getActive())
                .createdAt(s.getCreatedAt())
                .build();
    }

    private SupplierBillDto mapBillToDto(SupplierBill b) {
        return SupplierBillDto.builder()
                .id(b.getId())
                .billNumber(b.getBillNumber())
                .poId(b.getPurchaseOrder() != null ? b.getPurchaseOrder().getId() : null)
                .poNumber(b.getPurchaseOrder() != null ? b.getPurchaseOrder().getPoNumber() : null)
                .supplierId(b.getSupplier().getId())
                .supplierName(b.getSupplier().getName())
                .amount(b.getAmount())
                .status(b.getStatus())
                .dueDate(b.getDueDate())
                .notes(b.getNotes())
                .createdAt(b.getCreatedAt())
                .build();
    }
}
