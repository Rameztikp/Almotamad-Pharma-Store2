package migrations

import "gorm.io/gorm"

// SupplierTransaction is referenced by purchase invoices migration; define a minimal stub
// so that GORM AutoMigrate can compile. Replace with the real model if/when available.
type SupplierTransaction struct {
    gorm.Model
    ReferenceID uint
}
