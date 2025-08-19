package main

import (
	"flag"
	"fmt"
	"log"
	"os"
)

func main() {
	// تعريف الأوامر المتاحة
	createCmd := flag.NewFlagSet("create", flag.ExitOnError)
	checkCmd := flag.NewFlagSet("check", flag.ExitOnError)

	// التحقق من وجود أمر
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	switch os.Args[1] {
	case "create":
		err := createCmd.Parse(os.Args[2:])
		if err != nil {
			log.Fatalf("❌ فشل في معالجة الأمر create: %v", err)
		}
		err = RunCreateAdmin()
		if err != nil {
			log.Fatalf("❌ فشل في إنشاء المشرف: %v", err)
		}

	case "check":
		err := checkCmd.Parse(os.Args[2:])
		if err != nil {
			log.Fatalf("❌ فشل في معالجة الأمر check: %v", err)
		}
		err = RunCheckAdmin()
		if err != nil {
			log.Fatalf("❌ فشل في فحص المشرف: %v", err)
		}

	default:
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("طريقة الاستخدام:")
	fmt.Println("  create    - لإنشاء حساب مشرف جديد")
	fmt.Println("  check     - للتحقق من وجود المشرف")
}
