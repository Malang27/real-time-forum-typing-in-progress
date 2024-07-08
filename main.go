package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"real-time-forum/src"
	"strconv"
)

const (
	reset = "\033[0m"
	blue  = "\033[34m"
	red   = "\033[31m"
)

func main() {
	src.Init()
	src.Handle()

	port := getPortNr()
	portStr := strconv.Itoa(port)

	fmt.Printf("%s[SERVER_INFO] : Starting local Server...\n", reset)
	fmt.Printf("%s[SERVER_READY]: on http://localhost:%s ✅ \n", blue, portStr)
	fmt.Printf("[%sSERVER_INFO] : To stop the program : Ctrl + c\n%s", red, reset)

	err := http.ListenAndServe(":"+portStr, nil)
	if err != nil {
		log.Fatalf("%s[ERROR] : Failed to start server: %v\n%s", red, reset, err)
	}
}

// checks if inputted port nr exists/is correct
func getPortNr() int {
	if len(os.Args) == 2 {
		n, e := strconv.Atoi(os.Args[1])
		if e == nil && (n > 1023 && n < 65536) {
			return n
		}
	}
	return 8080
}
