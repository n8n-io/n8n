#!/command/with-contenv bashio
# ==============================================================================
# Home Assistant Community Add-on: Base Images
# Sets the log level correctly
# ==============================================================================
declare log_level

# Check if the log level configuration option exists
if bashio::config.exists log_level; then

    # Find the matching LOG_LEVEL
    log_level=$(bashio::string.lower "$(bashio::config log_level)") 
    case "${log_level}" in
        all)
            log_level="${__BASHIO_LOG_LEVEL_ALL}"
            ;;
        trace)
            log_level="${__BASHIO_LOG_LEVEL_TRACE}"
            ;;
        debug)
            log_level="${__BASHIO_LOG_LEVEL_DEBUG}"
            ;;
        info)
            log_level="${__BASHIO_LOG_LEVEL_INFO}"
            ;;
        notice)
            log_level="${__BASHIO_LOG_LEVEL_NOTICE}"
            ;;
        warning)
            log_level="${__BASHIO_LOG_LEVEL_WARNING}"
            ;;
        error)
            log_level="${__BASHIO_LOG_LEVEL_ERROR}"
            ;;
        fatal)
            log_level="${__BASHIO_LOG_LEVEL_FATAL}"
            ;;
        off)
            log_level="${__BASHIO_LOG_LEVEL_OFF}"
            ;;
        *)
            bashio::exit.nok "Unknown log_level: ${log_level}"
    esac

    # Save determined log level so S6 can pick it up later
    echo "${log_level}" > /var/run/s6/container_environment/LOG_LEVEL
    bashio::log.blue "Log level is set to ${__BASHIO_LOG_LEVELS[$log_level]}"
fi
